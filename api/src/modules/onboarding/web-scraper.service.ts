import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ScrapedWebsiteData {
	title?: string;
	description?: string;
	keywords?: string[];
	favicon?: string;
	ogImage?: string;
	headings?: string[];
	links?: string[];
	internalLinks?: string[];
	externalLinks?: string[];
	content?: string;
	wordCount?: number;
}

export interface ScrapedPageData {
	url: string;
	path: string;
	title?: string;
	description?: string;
	keywords?: string[];
	ogImage?: string;
	headings?: string[];
	internalLinks?: string[];
	externalLinks?: string[];
	content?: string;
	wordCount?: number;
}

@Injectable()
export class WebScraperService {
	private readonly logger = new Logger(WebScraperService.name);
	private readonly MAX_PAGES_TO_SCRAPE = 50; // Limit pages to scrape
	private readonly MAX_DEPTH = 2; // Maximum depth level for nested scraping
	private readonly SCRAPE_DELAY_MS = 500; // Delay between requests to be polite

	async scrapeWebsite(url: string): Promise<ScrapedWebsiteData> {
		try {
			// Ensure URL has protocol
			const normalizedUrl = this.normalizeUrl(url);

			const response = await axios.get(normalizedUrl, {
				timeout: 30000,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; GetAISEO Bot/1.0)',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				},
				maxRedirects: 5,
			});

			const html = response.data;
			return this.parseHtml(html, normalizedUrl);
		} catch (error) {
			this.logger.error(`Failed to scrape website: ${url}`, error);
			throw new Error(`Failed to scrape website: ${error.message}`);
		}
	}

	/**
	 * Scrape a single page and return its data
	 */
	async scrapePage(url: string, baseUrl: string): Promise<ScrapedPageData | null> {
		try {
			const normalizedUrl = this.normalizeUrl(url);
			const baseDomain = this.extractDomain(baseUrl);

			// Skip if not same domain
			if (this.extractDomain(normalizedUrl) !== baseDomain) {
				return null;
			}

			const response = await axios.get(normalizedUrl, {
				timeout: 20000,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; GetAISEO Bot/1.0)',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				},
				maxRedirects: 3,
			});

			const html = response.data;
			const parsed = this.parseHtml(html, normalizedUrl);
			const path = this.extractPath(normalizedUrl);

			return {
				url: normalizedUrl,
				path,
				title: parsed.title,
				description: parsed.description,
				keywords: parsed.keywords,
				ogImage: parsed.ogImage,
				headings: parsed.headings,
				internalLinks: parsed.internalLinks,
				externalLinks: parsed.externalLinks,
				content: parsed.content,
				wordCount: parsed.wordCount,
			};
		} catch (error) {
			this.logger.warn(`Failed to scrape page: ${url}`, error.message);
			return null;
		}
	}

	/**
	 * Discover and scrape internal pages recursively
	 */
	async discoverAndScrapePages(
		baseUrl: string,
		onPageDiscovered?: (urls: string[]) => Promise<void>,
		onPageScraped?: (page: ScrapedPageData) => Promise<void>,
	): Promise<ScrapedPageData[]> {
		const normalizedBaseUrl = this.normalizeUrl(baseUrl);
		const baseDomain = this.extractDomain(normalizedBaseUrl);
		const scrapedPages: ScrapedPageData[] = [];
		const visitedUrls = new Set<string>();
		const urlsToScrape: { url: string; depth: number; }[] = [];

		// Start with the homepage
		const homepageData = await this.scrapeWebsite(normalizedBaseUrl);

		// Get internal links from homepage
		const internalLinks = homepageData.internalLinks || [];

		// Notify about discovered pages
		if (onPageDiscovered) {
			await onPageDiscovered(internalLinks);
		}

		// Add internal links to queue
		for (const link of internalLinks) {
			const normalizedLink = this.normalizeInternalUrl(link, normalizedBaseUrl);
			if (normalizedLink && !visitedUrls.has(normalizedLink)) {
				urlsToScrape.push({ url: normalizedLink, depth: 1 });
				visitedUrls.add(normalizedLink);
			}
		}

		// Process queue
		while (urlsToScrape.length > 0 && scrapedPages.length < this.MAX_PAGES_TO_SCRAPE) {
			const { url, depth } = urlsToScrape.shift()!;

			// Skip if we've reached max depth
			if (depth > this.MAX_DEPTH) {
				continue;
			}

			// Add delay to be polite
			await this.delay(this.SCRAPE_DELAY_MS);

			const pageData = await this.scrapePage(url, normalizedBaseUrl);
			if (pageData) {
				scrapedPages.push({ ...pageData, depth } as ScrapedPageData & { depth: number; });

				// Notify about scraped page
				if (onPageScraped) {
					await onPageScraped(pageData);
				}

				// Add new internal links to queue (only if not at max depth)
				if (depth < this.MAX_DEPTH && pageData.internalLinks) {
					for (const link of pageData.internalLinks) {
						const normalizedLink = this.normalizeInternalUrl(link, normalizedBaseUrl);
						if (normalizedLink && !visitedUrls.has(normalizedLink)) {
							urlsToScrape.push({ url: normalizedLink, depth: depth + 1 });
							visitedUrls.add(normalizedLink);
						}
					}
				}
			}
		}

		return scrapedPages;
	}

	/**
	 * Get list of internal links without scraping them
	 */
	getInternalLinksFromPage(scrapedData: ScrapedWebsiteData): string[] {
		return scrapedData.internalLinks || [];
	}

	private normalizeUrl(url: string): string {
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			return `https://${url}`;
		}
		return url;
	}

	private normalizeInternalUrl(url: string, baseUrl: string): string | null {
		try {
			const resolved = new URL(url, baseUrl);
			const base = new URL(baseUrl);

			// Only process same-domain URLs
			if (resolved.hostname !== base.hostname) {
				return null;
			}

			// Skip common non-content URLs
			const skipPatterns = [
				/\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|zip|rar|exe|dmg)$/i,
				/\?(utm_|ref=|source=)/i,
				/#/,
				/\/wp-admin\//i,
				/\/wp-content\//i,
				/\/wp-includes\//i,
				/\/admin\//i,
				/\/login/i,
				/\/logout/i,
				/\/cart/i,
				/\/checkout/i,
				/\/account/i,
			];

			for (const pattern of skipPatterns) {
				if (pattern.test(resolved.href)) {
					return null;
				}
			}

			// Normalize the URL (remove trailing slash, lowercase)
			let normalized = resolved.origin + resolved.pathname;
			normalized = normalized.replace(/\/$/, ''); // Remove trailing slash

			return normalized;
		} catch {
			return null;
		}
	}

	private extractDomain(url: string): string {
		try {
			const parsed = new URL(url);
			return parsed.hostname;
		} catch {
			return '';
		}
	}

	private extractPath(url: string): string {
		try {
			const parsed = new URL(url);
			return parsed.pathname || '/';
		} catch {
			return '/';
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private parseHtml(html: string, baseUrl: string): ScrapedWebsiteData {
		const result: ScrapedWebsiteData = {};
		const baseDomain = this.extractDomain(baseUrl);

		// Extract title
		const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		if (titleMatch) {
			result.title = this.decodeHtmlEntities(titleMatch[1].trim());
		}

		// Extract meta description
		const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
			|| html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
		if (descMatch) {
			result.description = this.decodeHtmlEntities(descMatch[1].trim());
		}

		// Extract meta keywords
		const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i)
			|| html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']keywords["']/i);
		if (keywordsMatch) {
			result.keywords = keywordsMatch[1].split(',').map(k => k.trim()).filter(Boolean);
		}

		// Extract favicon
		const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
			|| html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
		if (faviconMatch) {
			result.favicon = this.resolveUrl(faviconMatch[1], baseUrl);
		}

		// Extract OG image
		const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
			|| html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
		if (ogImageMatch) {
			result.ogImage = this.resolveUrl(ogImageMatch[1], baseUrl);
		}

		// Extract headings (h1, h2, h3)
		const headings: string[] = [];
		const headingMatches = html.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
		for (const match of headingMatches) {
			const heading = this.decodeHtmlEntities(this.stripTags(match[1]).trim());
			if (heading) {
				headings.push(heading);
			}
		}
		result.headings = headings.slice(0, 20); // Limit to first 20 headings

		// Extract main content text
		result.content = this.extractTextContent(html);
		result.wordCount = result.content ? result.content.split(/\s+/).filter(Boolean).length : 0;

		// Extract and categorize links
		const internalLinks: string[] = [];
		const externalLinks: string[] = [];
		const allLinks: string[] = [];

		const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi);
		for (const match of linkMatches) {
			const href = match[1];
			if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
				const resolvedUrl = this.resolveUrl(href, baseUrl);
				allLinks.push(resolvedUrl);

				try {
					const linkDomain = this.extractDomain(resolvedUrl);
					if (linkDomain === baseDomain) {
						// Internal link
						const normalized = this.normalizeInternalUrl(resolvedUrl, baseUrl);
						if (normalized && !internalLinks.includes(normalized)) {
							internalLinks.push(normalized);
						}
					} else if (linkDomain) {
						// External link
						if (!externalLinks.includes(resolvedUrl)) {
							externalLinks.push(resolvedUrl);
						}
					}
				} catch {
					// Skip invalid URLs
				}
			}
		}

		result.links = [...new Set(allLinks)].slice(0, 100);
		result.internalLinks = internalLinks.slice(0, 100);
		result.externalLinks = externalLinks.slice(0, 50);

		return result;
	}

	private extractTextContent(html: string): string {
		// Remove script and style tags
		let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
		text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
		text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
		text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
		text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

		// Strip all HTML tags
		text = this.stripTags(text);

		// Clean up whitespace
		text = text.replace(/\s+/g, ' ').trim();

		// Decode HTML entities
		text = this.decodeHtmlEntities(text);

		// Limit content length
		return text.substring(0, 10000);
	}

	private stripTags(html: string): string {
		return html.replace(/<[^>]+>/g, ' ');
	}

	private decodeHtmlEntities(text: string): string {
		const entities: Record<string, string> = {
			'&amp;': '&',
			'&lt;': '<',
			'&gt;': '>',
			'&quot;': '"',
			'&#39;': "'",
			'&nbsp;': ' ',
			'&copy;': '©',
			'&reg;': '®',
			'&trade;': '™',
		};

		let decoded = text;
		for (const [entity, char] of Object.entries(entities)) {
			decoded = decoded.replace(new RegExp(entity, 'gi'), char);
		}

		// Handle numeric entities
		decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
		decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

		return decoded;
	}

	private resolveUrl(url: string, baseUrl: string): string {
		try {
			return new URL(url, baseUrl).href;
		} catch {
			return url;
		}
	}
}
