export const dictionaries = {
    en: {
        // Common
        common: {
            appName: "AI Code Review",
            loading: "Loading...",
            save: "Save",
            cancel: "Cancel",
            delete: "Delete",
            back: "Back",
            new: "New",
            search: "Search",
            noResults: "No results found",
            justNow: "just now",
            mAgo: (m: number) => `${m}m ago`,
            hAgo: (h: number) => `${h}h ago`,
            dAgo: (d: number) => `${d}d ago`,
        },
        // Navigation
        nav: {
            overview: "Overview",
            reviews: "Reviews",
            settings: "Settings",
        },
        // Dashboard
        dashboard: {
            title: "Dashboard",
            newReview: "New Review",
            totalReviews: "Total Reviews",
            completedToday: (n: number) => `${n} completed today`,
            issuesFound: "Issues Found",
            byPatternScanner: "By pattern scanner",
            activeRepos: "Active Repos",
            uniqueSources: "Unique sources reviewed",
            recentReviews: "Recent Reviews",
            noReviewsYet: "No reviews yet. Create your first review to get started.",
            showingRecent: (n: number) => `Showing ${n} most recent reviews.`,
            noReviews: "No reviews yet",
            createFirst: "Create First Review",
            issues: (n: number) => `${n} issues`,
        },
        // Reviews List
        reviews: {
            title: "Reviews",
            newReview: "New Review",
            noReviewsTitle: "No reviews yet",
            noReviewsDesc: "Start by creating a new code review. You can paste code or provide a GitLab MR URL.",
            createFirst: "Create First Review",
            gridView: "Grid",
            listView: "List",
            sortBy: "Sort by",
            sortDate: "Date",
            sortScore: "Score",
            sortIssues: "Issues",
            groupBy: "Group by",
            groupNone: "None",
            groupDate: "Date",
            groupToday: "Today",
            groupYesterday: "Yesterday",
            groupThisWeek: "This Week",
            groupOlder: "Older",
            issues: (n: number) => `${n} issues`,
            searchPlaceholder: "Search reviews by title...",
            searchNoResults: "No reviews match your search.",
        },
        // Create Review
        createReview: {
            title: "Create New Review",
            reviewSource: "Review Source",
            reviewSourceDesc: "Provide code via URL or paste directly.",
            connectUrl: "Connect URL",
            pasteCode: "Paste Code",
            repoUrl: "Repository / MR URL",
            urlPlaceholder: "https://gitlab.example.com/group/project/-/merge_requests/123",
            urlHint: "Supports GitLab MR URLs. The diff will be fetched automatically.",
            codeLabel: "Code to Review",
            codePlaceholder: "// Paste your code here...",
            startReview: "Start Review",
            scanning: "Scanning...",
            // AI Model Selection
            aiConfig: "AI Model",
            aiConfigDesc: "Choose Gemini model for this review.",
            tierFast: "Fast",
            tierFastDesc: "Gemini Flash — fast & free, great for routine reviews",
            tierQuality: "Quality",
            tierQualityDesc: "Gemini Pro — deeper analysis for complex code",
            recommended: "Recommended",
            free: "Free",
            // Context Documents
            contextDocs: "Context Documents",
            contextDocsDesc: "Upload project docs to help AI understand business logic.",
            clickUpload: "Click to upload",
            supportedFormats: "PDF, Word, Excel, Text, Draw.io",
            addUrl: "Or add a Figma / URL reference",
            // Pattern Results
            patternResults: "Pattern Scan Results",
            noIssues: "No issues detected by pattern scanner.",
            foundIssues: (n: number) => `Found ${n} potential issues.`,
            viewReport: "View Full Report",
        },
        // Review Detail
        reviewDetail: {
            runAiReview: "Run AI Review",
            codeFiles: "Code & Files",
            issues: "Issues",
            aiReview: "AI Review",
            changedFiles: (n: number) => `Changed Files (${n})`,
            patternScan: "Pattern Scan Issues",
            noIssuesFound: "No issues found by the pattern scanner.",
            aiNotStarted: "AI Review Not Started",
            aiNotStartedDesc: 'Click "Run AI Review" button to start AI-powered code analysis.',
            aiAnalyzing: "AI is analyzing your code...",
            exportPdf: "Export PDF",
            completed: "Completed",
            failed: "Failed",
            pending: "Pending",
        },
        // Settings
        settings: {
            title: "Settings",
            subtitle: "Manage your account settings and AI preferences.",
            aiConfig: "AI Configuration",
            aiConfigDesc: "Google Gemini is used for all code reviews. Configure your API key in .env.local.",
        },
    },
    vi: {
        // Chung
        common: {
            appName: "AI Code Review",
            loading: "Đang tải...",
            save: "Lưu",
            cancel: "Hủy",
            delete: "Xóa",
            back: "Quay lại",
            new: "Mới",
            search: "Tìm kiếm",
            noResults: "Không tìm thấy kết quả",
            justNow: "vừa xong",
            mAgo: (m: number) => `${m} phút trước`,
            hAgo: (h: number) => `${h} giờ trước`,
            dAgo: (d: number) => `${d} ngày trước`,
        },
        // Điều hướng
        nav: {
            overview: "Tổng quan",
            reviews: "Đánh giá",
            settings: "Cài đặt",
        },
        // Bảng điều khiển
        dashboard: {
            title: "Bảng điều khiển",
            newReview: "Tạo mới",
            totalReviews: "Tổng Review",
            completedToday: (n: number) => `${n} hoàn thành hôm nay`,
            issuesFound: "Lỗi phát hiện",
            byPatternScanner: "Bởi pattern scanner",
            activeRepos: "Repos hoạt động",
            uniqueSources: "Nguồn đã review",
            recentReviews: "Review gần đây",
            noReviewsYet: "Chưa có review nào. Tạo review đầu tiên ngay.",
            showingRecent: (n: number) => `Hiển thị ${n} review gần nhất.`,
            noReviews: "Chưa có review",
            createFirst: "Tạo Review đầu tiên",
            issues: (n: number) => `${n} vấn đề`,
        },
        // Danh sách Review
        reviews: {
            title: "Đánh giá",
            newReview: "Tạo mới",
            noReviewsTitle: "Chưa có review nào",
            noReviewsDesc: "Bắt đầu bằng cách tạo một code review mới. Bạn có thể dán code hoặc nhập URL GitLab MR.",
            createFirst: "Tạo Review đầu tiên",
            gridView: "Lưới",
            listView: "Danh sách",
            sortBy: "Sắp xếp",
            sortDate: "Ngày",
            sortScore: "Điểm",
            sortIssues: "Lỗi",
            groupBy: "Nhóm theo",
            groupNone: "Không",
            groupDate: "Ngày",
            groupToday: "Hôm nay",
            groupYesterday: "Hôm qua",
            groupThisWeek: "Tuần này",
            groupOlder: "Cũ hơn",
            issues: (n: number) => `${n} vấn đề`,
            searchPlaceholder: "Tìm kiếm review theo tiêu đề...",
            searchNoResults: "Không có review nào phù hợp.",
        },
        // Tạo Review
        createReview: {
            title: "Tạo Review mới",
            reviewSource: "Nguồn Code",
            reviewSourceDesc: "Cung cấp code qua URL hoặc dán trực tiếp.",
            connectUrl: "Kết nối URL",
            pasteCode: "Dán Code",
            repoUrl: "URL Repository / MR",
            urlPlaceholder: "https://gitlab.example.com/group/project/-/merge_requests/123",
            urlHint: "Hỗ trợ GitLab MR URL. Diff sẽ được tải tự động.",
            codeLabel: "Code cần Review",
            codePlaceholder: "// Dán code của bạn tại đây...",
            startReview: "Bắt đầu Review",
            scanning: "Đang quét...",
            // Chọn Model AI
            aiConfig: "Model AI",
            aiConfigDesc: "Chọn model Gemini cho review này.",
            tierFast: "Nhanh",
            tierFastDesc: "Gemini Flash — nhanh & miễn phí, phù hợp review hàng ngày",
            tierQuality: "Chất lượng",
            tierQualityDesc: "Gemini Pro — phân tích sâu cho code phức tạp",
            recommended: "Đề xuất",
            free: "Miễn phí",
            // Tài liệu Context
            contextDocs: "Tài liệu tham khảo",
            contextDocsDesc: "Upload tài liệu dự án để AI hiểu nghiệp vụ.",
            clickUpload: "Nhấn để tải lên",
            supportedFormats: "PDF, Word, Excel, Text, Draw.io",
            addUrl: "Hoặc thêm Figma / URL tham khảo",
            // Kết quả quét pattern
            patternResults: "Kết quả quét Pattern",
            noIssues: "Không phát hiện lỗi nào từ pattern scanner.",
            foundIssues: (n: number) => `Tìm thấy ${n} vấn đề tiềm ẩn.`,
            viewReport: "Xem báo cáo đầy đủ",
        },
        // Chi tiết Review
        reviewDetail: {
            runAiReview: "Chạy AI Review",
            codeFiles: "Code & Files",
            issues: "Vấn đề",
            aiReview: "AI Review",
            changedFiles: (n: number) => `Files thay đổi (${n})`,
            patternScan: "Pattern Scan",
            noIssuesFound: "Pattern scanner không phát hiện lỗi nào.",
            aiNotStarted: "Chưa chạy AI Review",
            aiNotStartedDesc: 'Nhấn "Chạy AI Review" để bắt đầu phân tích code bằng AI.',
            aiAnalyzing: "AI đang phân tích code của bạn...",
            exportPdf: "Xuất PDF",
            completed: "Hoàn thành",
            failed: "Thất bại",
            pending: "Đang chờ",
        },
        // Cài đặt
        settings: {
            title: "Cài đặt",
            subtitle: "Quản lý cài đặt tài khoản và tùy chọn AI.",
            aiConfig: "Cấu hình AI",
            aiConfigDesc: "Google Gemini được dùng cho tất cả code review. Cấu hình API key trong .env.local.",
        },
    },
};

export type Language = "en" | "vi";

export interface Dictionary {
    common: {
        appName: string; loading: string; save: string; cancel: string; delete: string;
        back: string; new: string; search: string; noResults: string; justNow: string;
        mAgo: (m: number) => string; hAgo: (h: number) => string; dAgo: (d: number) => string;
    };
    nav: { overview: string; reviews: string; settings: string };
    dashboard: {
        title: string; newReview: string; totalReviews: string;
        completedToday: (n: number) => string; issuesFound: string; byPatternScanner: string;
        activeRepos: string; uniqueSources: string; recentReviews: string;
        noReviewsYet: string; showingRecent: (n: number) => string;
        noReviews: string; createFirst: string; issues: (n: number) => string;
    };
    reviews: {
        title: string; newReview: string; noReviewsTitle: string; noReviewsDesc: string;
        createFirst: string; gridView: string; listView: string; sortBy: string;
        sortDate: string; sortScore: string; sortIssues: string; groupBy: string;
        groupNone: string; groupDate: string; groupToday: string; groupYesterday: string;
        groupThisWeek: string; groupOlder: string; issues: (n: number) => string;
        searchPlaceholder: string; searchNoResults: string;
    };
    createReview: {
        title: string; reviewSource: string; reviewSourceDesc: string; connectUrl: string;
        pasteCode: string; repoUrl: string; urlPlaceholder: string; urlHint: string;
        codeLabel: string; codePlaceholder: string; startReview: string; scanning: string;
        aiConfig: string; aiConfigDesc: string; tierFast: string; tierFastDesc: string;
        tierQuality: string; tierQualityDesc: string;
        recommended: string; free: string; contextDocs: string; contextDocsDesc: string;
        clickUpload: string; supportedFormats: string; addUrl: string;
        patternResults: string; noIssues: string; foundIssues: (n: number) => string;
        viewReport: string;
    };
    reviewDetail: {
        runAiReview: string; codeFiles: string; issues: string; aiReview: string;
        changedFiles: (n: number) => string; patternScan: string; noIssuesFound: string;
        aiNotStarted: string; aiNotStartedDesc: string; aiAnalyzing: string;
        exportPdf: string; completed: string; failed: string; pending: string;
    };
    settings: {
        title: string; subtitle: string; aiConfig: string; aiConfigDesc: string;
    };
}

