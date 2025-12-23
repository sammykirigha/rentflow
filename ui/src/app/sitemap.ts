import { MetadataRoute } from 'next';
import { pageApi } from '@/lib/api/page.api';
import { subjectApi } from '@/lib/api/subject.api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

  try {
    // Get all published pages and subjects
    const [pages, subjects] = await Promise.all([
      pageApi.getAll('true'), // Get only published pages
      subjectApi.getAll() // Get all subjects
    ]);
    
    // Generate sitemap entries for pages
    const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // Generate sitemap entries for subjects
    const subjectEntries: MetadataRoute.Sitemap = subjects.map((subject) => ({
      url: `${baseUrl}/${subject.slug}`,
      lastModified: new Date(subject.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.9, // Higher priority for educational content
    }));

    // Static pages
    const staticEntries: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      // Add more static pages as needed
    ];

    return [...staticEntries, ...pageEntries, ...subjectEntries];
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    
    // Return basic sitemap if API fails
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ];
  }
}