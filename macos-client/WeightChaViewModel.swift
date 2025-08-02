//
//  WeightChaViewModel.swift
//  WeightCha macOS Client
//
//  Bridges TrackWeight pressure detection with WeightCha verification system
//

import OpenMultitouchSupport
import SwiftUI
import Combine
import Foundation

@MainActor
final class WeightChaViewModel: ObservableObject {
    @Published var challengeState: ChallengeState = .idle
    @Published var currentPressure: Float = 0.0
    @Published var isListening = false
    @Published var hasTouch = false
    @Published var verificationProgress: Float = 0.0
    @Published var currentChallenge: WeightChaChallenge?
    
    private let manager = OMSManager.shared
    private var task: Task<Void, Never>?
    private var rawPressure: Float = 0.0
    private var zeroOffset: Float = 0.0
    private var pressureData: [PressureSample] = []
    private var challengeStartTime: Date?
    
    // WebSocket server for browser communication
    private var webSocketServer: WeightChaWebSocketServer?
    
    init() {
        setupWebSocketServer()
    }
    
    // MARK: - Challenge Management
    
    func startChallenge(_ challenge: WeightChaChallenge) {
        currentChallenge = challenge
        challengeState = .waitingForTouch
        pressureData.removeAll()
        verificationProgress = 0.0
        challengeStartTime = Date()
        
        startListening()
    }
    
    func cancelChallenge() {
        challengeState = .idle
        currentChallenge = nil
        stopListening()
        pressureData.removeAll()
    }
    
    // MARK: - Pressure Detection (from TrackWeight)
    
    func startListening() {
        if manager.startListening() {
            isListening = true
        }
        
        task = Task { [weak self, manager] in
            for await touchData in manager.touchDataStream {
                await MainActor.run {
                    self?.processTouchData(touchData)
                }
            }
        }
    }
    
    func stopListening() {
        task?.cancel()
        if manager.stopListening() {
            isListening = false
            hasTouch = false
            currentPressure = 0.0
        }
    }
    
    private func processTouchData(_ touchData: [OMSTouchData]) {
        guard let challenge = currentChallenge else { return }
        
        if touchData.isEmpty {
            // Finger lifted
            hasTouch = false
            currentPressure = 0.0
            
            if challengeState == .recording {
                // Challenge completed
                completeChallenge()
            }
        } else {
            // Finger on trackpad
            hasTouch = true
            rawPressure = touchData.first?.pressure ?? 0.0
            currentPressure = max(0, rawPressure - zeroOffset)
            
            // Handle challenge state transitions
            handleChallengeStateTransition(touchData)
            
            // Record pressure data if in recording state
            if challengeState == .recording {
                recordPressureData(touchData)
            }
        }
        
        // Update progress
        updateProgress()
    }
    
    private func handleChallengeStateTransition(_ touchData: [OMSTouchData]) {
        guard let challenge = currentChallenge else { return }
        
        switch challengeState {
        case .waitingForTouch:
            if hasTouch {
                // Set zero offset when touch first detected
                zeroOffset = rawPressure
                challengeState = .recording
                challengeStartTime = Date()
            }
            
        case .recording:
            // Check if challenge duration exceeded
            if let startTime = challengeStartTime {
                let elapsed = Date().timeIntervalSince(startTime)
                if elapsed >= TimeInterval(challenge.duration) {
                    completeChallenge()
                }
            }
            
        default:
            break
        }
    }
    
    private func recordPressureData(_ touchData: [OMSTouchData]) {
        let timestamp = Date().timeIntervalSince1970 * 1000 // milliseconds
        
        for touch in touchData {
            let sample = PressureSample(
                timestamp: timestamp,
                pressure: touch.pressure,
                touchArea: touch.size,
                position: PressurePosition(
                    x: touch.normalizedPosition.x,
                    y: touch.normalizedPosition.y
                )
            )
            pressureData.append(sample)
        }
    }
    
    private func updateProgress() {
        guard let challenge = currentChallenge,
              let startTime = challengeStartTime,
              challengeState == .recording else {
            verificationProgress = 0.0
            return
        }
        
        let elapsed = Date().timeIntervalSince(startTime)
        let progress = min(1.0, Float(elapsed) / Float(challenge.duration))
        verificationProgress = progress
    }
    
    private func completeChallenge() {
        challengeState = .processing
        
        Task {
            do {
                let result = try await submitVerification()
                await MainActor.run {
                    self.challengeState = .completed(result)
                    self.notifyWebClient(result: result)
                }
            } catch {
                await MainActor.run {
                    self.challengeState = .failed(error)
                    self.notifyWebClient(error: error)
                }
            }
        }
    }
    
    // MARK: - API Communication
    
    private func submitVerification() async throws -> VerificationResult {
        guard let challenge = currentChallenge else {
            throw WeightChaError.noChallengeActive
        }
        
        let verificationRequest = VerificationRequest(
            challengeId: challenge.id,
            pressureData: pressureData,
            clientInfo: ClientInfo(
                userAgent: "WeightCha macOS Client",
                platform: "macOS",
                trackpadModel: getTrackpadModel()
            )
        )
        
        return try await WeightChaAPIClient.shared.submitVerification(verificationRequest)
    }
    
    private func getTrackpadModel() -> String {
        // Detect trackpad model if possible
        return "Force Touch" // Default for now
    }
    
    // MARK: - WebSocket Server Setup
    
    private func setupWebSocketServer() {
        webSocketServer = WeightChaWebSocketServer(port: 8080)
        webSocketServer?.delegate = self
        webSocketServer?.start()
    }
    
    private func notifyWebClient(result: VerificationResult) {
        let message = WebSocketMessage(
            type: "challenge_complete",
            data: ["result": result.toJSON()]
        )
        webSocketServer?.broadcast(message)
    }
    
    private func notifyWebClient(error: Error) {
        let message = WebSocketMessage(
            type: "challenge_error",
            data: ["error": error.localizedDescription]
        )
        webSocketServer?.broadcast(message)
    }
    
    deinit {
        task?.cancel()
        manager.stopListening()
        webSocketServer?.stop()
    }
}

// MARK: - WebSocket Server Delegate

extension WeightChaViewModel: WeightChaWebSocketServerDelegate {
    func webSocketServer(_ server: WeightChaWebSocketServer, didReceiveMessage message: WebSocketMessage) {
        switch message.type {
        case "start_challenge":
            if let challengeData = message.data["config"] as? [String: Any],
               let challenge = WeightChaChallenge(from: challengeData) {
                startChallenge(challenge)
            }
            
        case "cancel_challenge":
            cancelChallenge()
            
        default:
            break
        }
    }
}

// MARK: - Data Models

struct PressureSample: Codable {
    let timestamp: Double
    let pressure: Float
    let touchArea: Float?
    let position: PressurePosition?
}

struct PressurePosition: Codable {
    let x: Float
    let y: Float
}

struct WeightChaChallenge {
    let id: String
    let type: ChallengeType
    let difficulty: String
    let duration: Int
    let instructions: String
    
    init?(from data: [String: Any]) {
        guard let id = data["challengeId"] as? String,
              let typeString = data["type"] as? String,
              let type = ChallengeType(rawValue: typeString),
              let difficulty = data["difficulty"] as? String,
              let duration = data["duration"] as? Int,
              let instructions = data["instructions"] as? String else {
            return nil
        }
        
        self.id = id
        self.type = type
        self.difficulty = difficulty
        self.duration = duration
        self.instructions = instructions
    }
}

enum ChallengeType: String, CaseIterable {
    case pressurePattern = "pressure_pattern"
    case rhythmTest = "rhythm_test"
    case sustainedPressure = "sustained_pressure"
    case progressivePressure = "progressive_pressure"
}

enum ChallengeState: Equatable {
    case idle
    case waitingForTouch
    case recording
    case processing
    case completed(VerificationResult)
    case failed(Error)
    
    static func == (lhs: ChallengeState, rhs: ChallengeState) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle), (.waitingForTouch, .waitingForTouch),
             (.recording, .recording), (.processing, .processing):
            return true
        case (.completed, .completed), (.failed, .failed):
            return true
        default:
            return false
        }
    }
}

struct VerificationResult: Codable {
    let verificationId: String
    let challengeId: String
    let isHuman: Bool
    let confidence: Float
    let token: String
    
    func toJSON() -> [String: Any] {
        return [
            "verificationId": verificationId,
            "challengeId": challengeId,
            "isHuman": isHuman,
            "confidence": confidence,
            "token": token
        ]
    }
}

struct VerificationRequest: Codable {
    let challengeId: String
    let pressureData: [PressureSample]
    let clientInfo: ClientInfo
}

struct ClientInfo: Codable {
    let userAgent: String
    let platform: String
    let trackpadModel: String
}

enum WeightChaError: Error {
    case noChallengeActive
    case apiError(String)
    case networkError
    
    var localizedDescription: String {
        switch self {
        case .noChallengeActive:
            return "No challenge is currently active"
        case .apiError(let message):
            return "API Error: \(message)"
        case .networkError:
            return "Network connection error"
        }
    }
}
