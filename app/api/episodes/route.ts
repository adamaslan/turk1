import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const textDir = path.join(process.cwd(), 'text');
    const files = fs.readdirSync(textDir).sort();

    const episodes = files
        .filter(f => /^ep(0[6-9]|[1-9]\d)/.test(f) && f.endsWith('.md'))
        .map(filename => {
            const content = fs.readFileSync(path.join(textDir, filename), 'utf-8').trim();
            // Strip the episode title (everything before the first $$)
            const firstDelim = content.indexOf('$$');
            const text = firstDelim !== -1 ? content.slice(firstDelim + 2).trim() : content;
            const title = firstDelim !== -1 ? content.slice(0, firstDelim).trim() : filename;
            return { filename, title, text };
        });

    return NextResponse.json({ episodes });
}
