"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserDashboardData, type RecentArticle, type RecentKeyword, type UserDashboardData } from "@/lib/api/user-dashboard.api";
import { FileText, Key, Loader2, PenTool, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  generating: "bg-yellow-100 text-yellow-800",
  generated: "bg-green-100 text-green-800",
  published: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
};

export default function UserDashboard() {
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { stats, recentArticles, recentKeywords } = dashboardData;

  const statsDisplay = [
    {
      title: "Total Keywords",
      value: stats.totalKeywords.toLocaleString(),
      subtitle: `${stats.primaryKeywords} primary, ${stats.secondaryKeywords} secondary`,
      icon: Key,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Total Articles",
      value: stats.totalArticles.toLocaleString(),
      subtitle: `${stats.generatedArticles} generated`,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Published",
      value: stats.publishedArticles.toLocaleString(),
      subtitle: "Articles published",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Drafts",
      value: stats.draftArticles.toLocaleString(),
      subtitle: "Articles in draft",
      icon: PenTool,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
        <p className="text-gray-600">Your content creation stats at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsDisplay.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Articles */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Articles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4">
              {recentArticles.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No articles yet. Start by creating your first article!
                </div>
              ) : (
                recentArticles.map((article: RecentArticle) => (
                  <div key={article.articleId} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {article.primaryKeyword?.keyword && (
                            <span className="mr-2">Keyword: {article.primaryKeyword.keyword}</span>
                          )}
                          {article.wordCount > 0 && <span>{article.wordCount} words</span>}
                        </p>
                      </div>
                      <Badge className={`text-xs shrink-0 ${statusColors[article.status] || "bg-gray-100 text-gray-800"}`}>
                        {article.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <Link href="/dashboard/articles">
                <Button variant="outline" className="w-full">
                  View All Articles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Keywords */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Keywords</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4">
              {recentKeywords.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No keywords yet. Add your first keyword to get started!
                </div>
              ) : (
                recentKeywords.map((keyword: RecentKeyword) => (
                  <div key={keyword.keywordId} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium text-gray-900 truncate">{keyword.keyword}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Difficulty: {keyword.difficulty} | Volume: {keyword.volume}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {keyword.isPrimary && (
                          <Badge className="text-xs bg-purple-100 text-purple-800">Primary</Badge>
                        )}
                        {keyword.isAnalyzed && (
                          <Badge className="text-xs bg-green-100 text-green-800">Analyzed</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-100">
              <Link href="/dashboard/keywords">
                <Button variant="outline" className="w-full">
                  View All Keywords
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}