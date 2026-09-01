import CallKit
import Flutter
import PushKit
import UIKit
import UserNotifications

/// Push, and the ring.
///
/// Two separate registrations, because Apple treats them as two different
/// things. An ordinary notification uses the APNs token and shows a banner. A
/// call uses PushKit, which wakes the app even from cold — and Apple requires
/// that every PushKit wake reports a call to CallKit almost immediately, or it
/// stops delivering them to this app altogether. So the incoming call is
/// reported here, in the wake itself, before Flutter is asked anything.
///
/// That also produces the behaviour a phone should have: the system's own
/// full-screen call UI, over the lock screen, with a real ringtone.
@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var channel: FlutterMethodChannel?
  private var voipRegistry: PKPushRegistry?
  private var cachedApnsToken: String?
  private let callProvider: CXProvider = {
    let configuration = CXProviderConfiguration(localizedName: "FizMoh")
    configuration.supportsVideo = false
    configuration.maximumCallsPerCallGroup = 1
    configuration.supportedHandleTypes = [.phoneNumber, .generic]
    return CXProvider(configuration: configuration)
  }()

  /// The call currently being reported, so answering can hand its details over.
  private var pendingCall: [String: Any]?
  private var pendingCallUUID: UUID?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    callProvider.setDelegate(self, queue: nil)
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
      if granted {
        DispatchQueue.main.async {
          application.registerForRemoteNotifications()
        }
      }
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

    guard let controller = window?.rootViewController as? FlutterViewController else { return }
    let channel = FlutterMethodChannel(
      name: "app.fizmoh.inbox/push", binaryMessenger: controller.binaryMessenger)
    self.channel = channel

    if let token = cachedApnsToken {
      channel.invokeMethod("apnsToken", arguments: token)
    }

    channel.setMethodCallHandler { [weak self] call, result in
      switch call.method {
      case "register":
        self?.requestPermissionAndRegister(result: result)
      case "registerVoip":
        self?.registerForVoip()
        result(true)
      case "callAnswered":
        // Flutter has audio flowing; tell the system so the call UI settles
        // from "connecting" into a running call with its timer.
        self?.markConnected()
        result(true)
      case "callEnded":
        self?.endSystemCall()
        result(true)
      case "showNotification":
        if let args = call.arguments as? [String: Any],
           let title = args["title"] as? String,
           let body = args["body"] as? String {
          self?.scheduleLocalNotification(title: title, body: body, conversationId: args["conversationId"] as? String)
        }
        result(true)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private func scheduleLocalNotification(title: String, body: String, conversationId: String?) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = UNNotificationSound.default
    if let conversationId = conversationId {
      content.userInfo = ["conversationId": conversationId]
    }
    let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
  }

  // ── ordinary notifications ────────────────────────────────────────────────

  private func requestPermissionAndRegister(result: @escaping FlutterResult) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) {
      granted, _ in
      DispatchQueue.main.async { [weak self] in
        guard granted else {
          result(nil)
          return
        }
        UIApplication.shared.registerForRemoteNotifications()
        if let token = self?.cachedApnsToken {
          self?.channel?.invokeMethod("apnsToken", arguments: token)
          result(token)
        } else {
          result("pending")
        }
      }
    }
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    let token = deviceToken.map { String(format: "%02x", $0) }.joined()
    cachedApnsToken = token
    channel?.invokeMethod("apnsToken", arguments: token)
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  /// Opening the app from a notification should land on the conversation it is
  /// about, not on whatever screen happened to be open.
  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let info = response.notification.request.content.userInfo
    if let conversationId = info["conversationId"] as? String {
      channel?.invokeMethod("openConversation", arguments: conversationId)
    }
    completionHandler()
  }

  /// Present banner, sound, and badge on device for notifications.
  override func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .list, .badge, .sound])
    } else {
      completionHandler([.alert, .badge, .sound])
    }
  }

  // ── calls ─────────────────────────────────────────────────────────────────

  private func registerForVoip() {
    guard voipRegistry == nil else { return }
    let registry = PKPushRegistry(queue: .main)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
    voipRegistry = registry
  }

  private func markConnected() {
    guard let uuid = pendingCallUUID else { return }
    callProvider.reportOutgoingCall(with: uuid, connectedAt: Date())
  }

  private func endSystemCall() {
    guard let uuid = pendingCallUUID else { return }
    callProvider.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
    pendingCallUUID = nil
    pendingCall = nil
  }
}

// MARK: - PushKit

extension AppDelegate: PKPushRegistryDelegate {
  func pushRegistry(
    _ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType
  ) {
    let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    channel?.invokeMethod("voipToken", arguments: token)
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    let info = payload.dictionaryPayload
    let uuid = UUID()
    pendingCallUUID = uuid
    pendingCall = info as? [String: Any]

    let name = info["customerName"] as? String ?? info["from"] as? String ?? "WhatsApp call"
    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: name)
    update.hasVideo = false
    update.supportsGrouping = false
    update.supportsUngrouping = false
    update.supportsHolding = false

    // Reported before anything else is attempted. Apple terminates an app that
    // takes a VoIP push without reporting a call, and the report is what puts
    // the ringing screen up whether or not the app was running.
    callProvider.reportNewIncomingCall(with: uuid, update: update) { [weak self] _ in
      self?.channel?.invokeMethod("incomingCall", arguments: info)
      completion()
    }
  }

  func pushRegistry(
    _ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType
  ) {
    channel?.invokeMethod("voipToken", arguments: nil)
  }
}

// MARK: - CallKit

extension AppDelegate: CXProviderDelegate {
  func providerDidReset(_ provider: CXProvider) {
    channel?.invokeMethod("callAction", arguments: "reset")
    pendingCallUUID = nil
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    // The system has taken the tap; Flutter builds the WebRTC answer.
    channel?.invokeMethod("callAction", arguments: "answer")
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    channel?.invokeMethod("callAction", arguments: "end")
    pendingCallUUID = nil
    pendingCall = nil
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    channel?.invokeMethod("callAction", arguments: action.isMuted ? "mute" : "unmute")
    action.fulfill()
  }
}
