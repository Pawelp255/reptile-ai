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

    enum CodingKeys: String, CodingKey {
        case version
        case generatedAt
        case date
        case overdueCount
        case dueTodayCount
        case completedTodayCount
        case nextImportantTask
        case animalName
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        version = try container.decodeIfPresent(Int.self, forKey: .version) ?? 1
        generatedAt = try container.decodeIfPresent(String.self, forKey: .generatedAt) ?? ISO8601DateFormatter().string(from: Date())
        date = try container.decodeIfPresent(String.self, forKey: .date) ?? Self.todayString()
        overdueCount = try container.decode(Int.self, forKey: .overdueCount)
        dueTodayCount = try container.decode(Int.self, forKey: .dueTodayCount)
        completedTodayCount = try container.decode(Int.self, forKey: .completedTodayCount)
        nextImportantTask = try container.decodeIfPresent(WatchCareTask.self, forKey: .nextImportantTask)
        animalName = try container.decodeIfPresent(String.self, forKey: .animalName)
    }

    private static func todayString() -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}

struct WatchCareTask: Codable, Identifiable {
    let id: String
    let taskType: String
    let animalId: String
    let animalName: String?
    let dueDate: String
    let isOverdue: Bool

    var action: WatchCareAction? {
        WatchCareAction(rawValue: taskType)
    }

    var title: String {
        action?.title ?? "Check"
    }

    var systemImage: String {
        action?.systemImage ?? "checklist"
    }
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
