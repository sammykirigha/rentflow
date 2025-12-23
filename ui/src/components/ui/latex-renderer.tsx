"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useRef } from "react";

interface LatexRendererProps {
	content: string;
	className?: string;
}

/**
 * Renders text content with LaTeX mathematical expressions.
 * Supports both inline ($...$) and block ($$...$$) LaTeX expressions.
 */
export default function LatexRenderer({ content, className = "" }: LatexRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current || !content) return;

		// Process the content and render LaTeX
		const processedContent = renderLatexContent(content);
		containerRef.current.innerHTML = processedContent;
	}, [content]);

	return (
		<div
			ref={containerRef}
			className={`latex-content prose prose-sm max-w-none ${className}`}
		/>
	);
}

/**
 * Process content string and render LaTeX expressions
 */
function renderLatexContent(content: string): string {
	if (!content) return "";

	let result = content;

	// First, handle block math ($$...$$)
	result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
		try {
			return `<div class="katex-block my-4">${katex.renderToString(latex.trim(), {
				displayMode: true,
				throwOnError: false,
				strict: false,
			})}</div>`;
		} catch (error) {
			console.error("KaTeX block rendering error:", error);
			return `<div class="katex-error text-red-500">Error rendering: ${escapeHtml(latex)}</div>`;
		}
	});

	// Then, handle inline math ($...$)
	// Be careful not to match already processed blocks or escaped dollar signs
	result = result.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g, (_, latex) => {
		try {
			return katex.renderToString(latex.trim(), {
				displayMode: false,
				throwOnError: false,
				strict: false,
			});
		} catch (error) {
			console.error("KaTeX inline rendering error:", error);
			return `<span class="katex-error text-red-500">Error: ${escapeHtml(latex)}</span>`;
		}
	});

	// Handle line breaks for better readability
	result = result.replace(/\n/g, "<br />");

	return result;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
}
