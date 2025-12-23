"use client";

import Link from "next/link";
import { ArrowLeft, Home, Search, Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-full py-12">
      <div className="max-w-4xl w-full text-center">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <div className="text-6xl md:text-7xl font-bold text-gray-200 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-4">
              <AlertTriangle className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
             Page Not Found
          </h1>
          <p className="text-gray-600 mb-2">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <p className="text-sm text-gray-500">
            This could be due to a broken link, mistyped URL, or insufficient permissions.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-4 text-center">
              <div className="bg-blue-100 rounded-full p-2 w-10 h-10 mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Dashboard</h3>
              <p className="text-xs text-gray-600 mb-3">
                Return to the main admin dashboard
              </p>
              <Link href="/admin">
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-4 text-center">
              <div className="bg-green-100 rounded-full p-2 w-10 h-10 mx-auto mb-3 group-hover:bg-green-200 transition-colors">
                <Search className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Search</h3>
              <p className="text-xs text-gray-600 mb-3">
                Find what you&apos;re looking for
              </p>
              <Link href="/admin">
                <Button variant="outline" className="w-full">
                  Search Admin
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-4 text-center">
              <div className="bg-purple-100 rounded-full p-2 w-10 h-10 mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Settings</h3>
              <p className="text-xs text-gray-600 mb-3">
                Manage admin configurations
              </p>
              <Link href="/admin/settings">
                <Button variant="outline" className="w-full">
                  Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/admin">
            <Button variant="outline" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact the system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}