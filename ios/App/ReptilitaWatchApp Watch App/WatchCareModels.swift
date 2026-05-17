import Foundation

struct WatchCareSnapshot: Codable {
    let version: Int
    let generatedAt: String
    let date: String
    let overdueCount: Int
    let dueTodayCount: Int
    let completedTodayCount: Int
    let nextImportantTask: WatchCareTask?
    let animalName: String?
}

struct WatchCareTask: Codable, Identifiable {
    let id: String
    let taskType: WatchCareAction
    let animalId: String
    let animalName: String?
    let dueDate: String
    let isOverdue: Bool
}

enum WatchCareAction: String, Codable, CaseIterable, Identifiable {
    case feed
    case clean
    case mist

    var id: String { rawValue }

    var title: String {
        switch self {
        case .feed:
            return "Feed"
        case .clean:
            return "Clean"
        case .mist:
            return "Mist"
        }
    }

    var systemImage: String {
        switch self {
        case .feed:
            return "fork.knife"
        case .clean:
            return "sparkles"
        case .mist:
            return "humidity"
        }
    }
}
