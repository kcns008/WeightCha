//
//  WeightChaWebSocketServer.swift
//  WeightCha macOS Client
//
//  WebSocket server for browser communication
//

import Foundation
import Network

protocol WeightChaWebSocketServerDelegate: AnyObject {
    func webSocketServer(_ server: WeightChaWebSocketServer, didReceiveMessage message: WebSocketMessage)
}

class WeightChaWebSocketServer {
    weak var delegate: WeightChaWebSocketServerDelegate?
    
    private let port: UInt16
    private var listener: NWListener?
    private var connections: [NWConnection] = []
    private let queue = DispatchQueue(label: "weightcha.websocket")
    
    init(port: UInt16) {
        self.port = port
    }
    
    func start() {
        do {
            let parameters = NWParameters(tls: nil, tcp: NWProtocolTCP.Options())
            parameters.allowLocalEndpointReuse = true
            parameters.includePeerToPeer = true
            
            listener = try NWListener(using: parameters, on: NWEndpoint.Port(integerLiteral: port))
            
            listener?.newConnectionHandler = { [weak self] connection in
                self?.handleNewConnection(connection)
            }
            
            listener?.start(queue: queue)
            print("WeightCha WebSocket server started on port \(port)")
            
        } catch {
            print("Failed to start WebSocket server: \(error)")
        }
    }
    
    func stop() {
        connections.forEach { $0.cancel() }
        connections.removeAll()
        listener?.cancel()
        listener = nil
        print("WeightCha WebSocket server stopped")
    }
    
    func broadcast(_ message: WebSocketMessage) {
        let data = encodeMessage(message)
        connections.forEach { connection in
            if connection.state == .ready {
                sendData(data, to: connection)
            }
        }
    }
    
    private func handleNewConnection(_ connection: NWConnection) {
        connections.append(connection)
        
        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                print("WebSocket client connected")
                self?.startReceiving(on: connection)
            case .failed(let error):
                print("WebSocket connection failed: \(error)")
                self?.removeConnection(connection)
            case .cancelled:
                print("WebSocket client disconnected")
                self?.removeConnection(connection)
            default:
                break
            }
        }
        
        connection.start(queue: queue)
    }
    
    private func startReceiving(on connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, context, isComplete, error in
            
            if let error = error {
                print("WebSocket receive error: \(error)")
                self?.removeConnection(connection)
                return
            }
            
            if let data = data, !data.isEmpty {
                self?.handleReceivedData(data, from: connection)
            }
            
            if !isComplete {
                self?.startReceiving(on: connection)
            }
        }
    }
    
    private func handleReceivedData(_ data: Data, from connection: NWConnection) {
        // Simple WebSocket frame parsing (for basic text frames)
        guard data.count >= 2 else { return }
        
        let firstByte = data[0]
        let secondByte = data[1]
        
        // Check if it's a text frame (opcode 0x1)
        let opcode = firstByte & 0x0F
        guard opcode == 0x1 else { return }
        
        // Check if payload is masked (bit 7 of second byte)
        let masked = (secondByte & 0x80) != 0
        guard masked else { return } // Client messages should be masked
        
        // Get payload length
        var payloadLength = Int(secondByte & 0x7F)
        var dataIndex = 2
        
        if payloadLength == 126 {
            guard data.count >= 4 else { return }
            payloadLength = Int(data[2]) << 8 | Int(data[3])
            dataIndex = 4
        } else if payloadLength == 127 {
            // 64-bit length not supported in this simple implementation
            return
        }
        
        // Extract masking key
        guard data.count >= dataIndex + 4 else { return }
        let maskingKey = Array(data[dataIndex..<dataIndex + 4])
        dataIndex += 4
        
        // Extract and unmask payload
        guard data.count >= dataIndex + payloadLength else { return }
        var payload = Array(data[dataIndex..<dataIndex + payloadLength])
        
        for i in 0..<payload.count {
            payload[i] ^= maskingKey[i % 4]
        }
        
        // Convert to string and parse JSON
        guard let messageString = String(data: Data(payload), encoding: .utf8),
              let messageData = messageString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: messageData) as? [String: Any] else {
            return
        }
        
        let message = WebSocketMessage(from: json)
        delegate?.webSocketServer(self, didReceiveMessage: message)
    }
    
    private func sendData(_ data: Data, to connection: NWConnection) {
        connection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        })
    }
    
    private func removeConnection(_ connection: NWConnection) {
        connections.removeAll { $0 === connection }
        connection.cancel()
    }
    
    private func encodeMessage(_ message: WebSocketMessage) -> Data {
        guard let json = try? JSONSerialization.data(withJSONObject: message.toJSON()),
              let jsonString = String(data: json, encoding: .utf8),
              let payload = jsonString.data(using: .utf8) else {
            return Data()
        }
        
        // Create WebSocket frame for text message
        var frame = Data()
        
        // First byte: FIN (1) + RSV (000) + Opcode (0001 for text)
        frame.append(0x81)
        
        // Second byte: MASK (0) + Payload length
        let payloadLength = payload.count
        if payloadLength < 126 {
            frame.append(UInt8(payloadLength))
        } else if payloadLength < 65536 {
            frame.append(126)
            frame.append(UInt8(payloadLength >> 8))
            frame.append(UInt8(payloadLength & 0xFF))
        } else {
            // 64-bit length not supported in this simple implementation
            frame.append(127)
            for i in stride(from: 56, through: 0, by: -8) {
                frame.append(UInt8((payloadLength >> i) & 0xFF))
            }
        }
        
        // Payload
        frame.append(payload)
        
        return frame
    }
}

struct WebSocketMessage {
    let type: String
    let data: [String: Any]
    
    init(type: String, data: [String: Any] = [:]) {
        self.type = type
        self.data = data
    }
    
    init(from json: [String: Any]) {
        self.type = json["type"] as? String ?? ""
        self.data = json["data"] as? [String: Any] ?? [:]
    }
    
    func toJSON() -> [String: Any] {
        return [
            "type": type,
            "data": data
        ]
    }
}
