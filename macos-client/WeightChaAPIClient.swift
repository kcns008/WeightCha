//
//  WeightChaAPIClient.swift
//  WeightCha macOS Client
//
//  Handles communication with WeightCha backend API
//

import Foundation

class WeightChaAPIClient {
    static let shared = WeightChaAPIClient()
    
    private let baseURL: URL
    private let session: URLSession
    
    private init() {
        // Default to local development server
        self.baseURL = URL(string: "http://localhost:3000/api/v1")!
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - API Endpoints
    
    func submitVerification(_ request: VerificationRequest) async throws -> VerificationResult {
        let url = baseURL.appendingPathComponent("verification/submit")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(getApiKey())", forHTTPHeaderField: "Authorization")
        
        do {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            urlRequest.httpBody = try encoder.encode(request)
        } catch {
            throw WeightChaError.apiError("Failed to encode request: \(error.localizedDescription)")
        }
        
        do {
            let (data, response) = try await session.data(for: urlRequest)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw WeightChaError.networkError
            }
            
            guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
                let errorMessage = parseErrorMessage(from: data) ?? "HTTP \(httpResponse.statusCode)"
                throw WeightChaError.apiError(errorMessage)
            }
            
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            
            let apiResponse = try decoder.decode(APIResponse<VerificationData>.self, from: data)
            
            guard apiResponse.success else {
                throw WeightChaError.apiError(apiResponse.error ?? "Unknown error")
            }
            
            guard let verificationData = apiResponse.data else {
                throw WeightChaError.apiError("No verification data received")
            }
            
            return VerificationResult(
                verificationId: verificationData.verificationId,
                challengeId: verificationData.challengeId,
                isHuman: verificationData.isHuman,
                confidence: verificationData.confidence,
                token: verificationData.token
            )
            
        } catch {
            if error is WeightChaError {
                throw error
            } else {
                throw WeightChaError.networkError
            }
        }
    }
    
    func createChallenge(type: ChallengeType, difficulty: String, duration: Int) async throws -> WeightChaChallenge {
        let url = baseURL.appendingPathComponent("challenges")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(getApiKey())", forHTTPHeaderField: "Authorization")
        
        let requestBody = [
            "type": type.rawValue,
            "difficulty": difficulty,
            "duration": duration
        ]
        
        do {
            urlRequest.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        } catch {
            throw WeightChaError.apiError("Failed to encode request")
        }
        
        do {
            let (data, response) = try await session.data(for: urlRequest)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw WeightChaError.networkError
            }
            
            guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
                let errorMessage = parseErrorMessage(from: data) ?? "HTTP \(httpResponse.statusCode)"
                throw WeightChaError.apiError(errorMessage)
            }
            
            let apiResponse = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let responseData = apiResponse?["data"] as? [String: Any],
                  let challenge = WeightChaChallenge(from: responseData) else {
                throw WeightChaError.apiError("Invalid challenge response")
            }
            
            return challenge
            
        } catch {
            if error is WeightChaError {
                throw error
            } else {
                throw WeightChaError.networkError
            }
        }
    }
    
    func validateToken(_ token: String) async throws -> Bool {
        let url = baseURL.appendingPathComponent("verification/validate-token")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(getApiKey())", forHTTPHeaderField: "Authorization")
        
        let requestBody = ["token": token]
        
        do {
            urlRequest.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        } catch {
            throw WeightChaError.apiError("Failed to encode request")
        }
        
        do {
            let (data, response) = try await session.data(for: urlRequest)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw WeightChaError.networkError
            }
            
            guard httpResponse.statusCode == 200 else {
                return false
            }
            
            let apiResponse = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let responseData = apiResponse?["data"] as? [String: Any],
                  let isValid = responseData["valid"] as? Bool,
                  let isHuman = responseData["isHuman"] as? Bool else {
                return false
            }
            
            return isValid && isHuman
            
        } catch {
            return false
        }
    }
    
    // MARK: - Helper Methods
    
    private func getApiKey() -> String {
        // In a real app, this would be stored securely in Keychain
        // For now, return a placeholder
        return UserDefaults.standard.string(forKey: "WeightChaAPIKey") ?? "demo-api-key"
    }
    
    private func parseErrorMessage(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let error = json["error"] as? String else {
            return nil
        }
        return error
    }
}

// MARK: - API Response Models

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: String?
}

struct VerificationData: Codable {
    let verificationId: String
    let challengeId: String
    let status: String
    let isHuman: Bool
    let confidence: Float
    let submittedAt: String
    let token: String
}

// MARK: - Extended WeightChaChallenge

extension WeightChaChallenge {
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
