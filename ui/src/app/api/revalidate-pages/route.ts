import { pageApi } from '@/lib/api/page.api';
import { subjectApi } from '@/lib/api/subject.api';
import { revalidatePath } from 'next/cache';

export const GET = async () => {
  try {
    // Get all published pages and subjects
    const [pages, subjects] = await Promise.all([
      pageApi.getAll('true'), // Get only published pages
      subjectApi.getAll() // Get all subjects
    ]);

    // Revalidate each page
    const pageRevalidationPromises = pages.map(async (page) => {
      try {
        await revalidatePath(`/${page.slug}`);
        return { slug: page.slug, type: 'page', success: true };
      } catch (error) {
        console.error(`Failed to revalidate page /${page.slug}:`, error);
        return { slug: page.slug, type: 'page', success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Revalidate each subject
    const subjectRevalidationPromises = subjects.map(async (subject) => {
      try {
        await revalidatePath(`/ai-tutor/${subject.slug}`);
        return { slug: subject.slug, type: 'subject', success: true };
      } catch (error) {
        console.error(`Failed to revalidate subject /${subject.slug}:`, error);
        return { slug: subject.slug, type: 'subject', success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all([...pageRevalidationPromises, ...subjectRevalidationPromises]);

    // Also revalidate the sitemap
    await revalidatePath('/sitemap.xml');

    const successCount = results.filter(r => r.success).length;
    const pageSuccessCount = results.filter(r => r.success && r.type === 'page').length;
    const subjectSuccessCount = results.filter(r => r.success && r.type === 'subject').length;

    return new Response(JSON.stringify({
      success: true,
      message: `Revalidated ${successCount} of ${results.length} content items (${pageSuccessCount} pages, ${subjectSuccessCount} subjects)`,
      results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Failed to revalidate content:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to revalidate content',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};