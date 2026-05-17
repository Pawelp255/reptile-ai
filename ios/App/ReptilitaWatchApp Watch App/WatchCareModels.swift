import Foundation

struct WatchCareSnapshot: Codable {
    let version: Int
    let generatedAt: String
    let todayKey: String
    let overdueCount: Int
    let tasks: [WatchCareTask]
    let dailySummary: WatchCareDailySummary
}

struct WatchCareTask: Codable, Identifiable {
    let id: String
    let reptileName: String
    let taskKind: WatchCareTaskKind
    let label: String
    let dueDate: String
    let isOverdue: Bool
    let isDueToday: Bool
}

struct WatchCareDailySummary: Codable {
    let dueTodayCount: Int
    let completedTodayCount: Int
}

enum WatchCareTaskKind: String, Codable {
    case feeding
    case misting
    case cleaning
    case weightCheck
}
