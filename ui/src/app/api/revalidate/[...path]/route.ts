import { revalidatePath } from 'next/cache';

export const GET = async (request: Request, context: { params: Promise<{ path: string[] }> }) => {
    try {
        const { path } = await context.params;
        const fullPath = '/' + path.join('/');
        await revalidatePath(fullPath);

        return new Response(JSON.stringify({ success: true, message: `Revalidated path: ${fullPath}` }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: 'Revalidation failed', error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500 });
    }
}