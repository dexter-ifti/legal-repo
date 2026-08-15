'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, FileText, X, Filter, Sparkles, Building2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { formatRelativeTime } from '@/lib/format';
import { toast } from 'sonner';

export interface SearchResultItem {
  id: string;
  originalFilename: string;
  documentType: string | null;
  processingStatus: string;
  matchStatus: string;
  uploadedAt: string;
  case: {
    id: string;
    title: string;
    caseNumber: string | null;
    cnrNumber: string | null;
    court: string | null;
  } | null;
  excerpt: string | null;
  matchedFields: string[];
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSearchResults = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const res = await fetch(`${API_URL}/api/v1/search?q=${encodeURIComponent(q)}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.data?.results || []);
    } catch (err: unknown) {
      console.error('Search query error:', err);
      toast.error('Failed to execute search query');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setQuery(initialQuery);
    if (initialQuery) fetchSearchResults(initialQuery);
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSearchResults(query);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Search className="h-6 w-6 text-brand" />
          Global Tenant Search
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Instant multi-field search across case titles, numbers, parties, document types, and extracted text.
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, case numbers, CNR, parties, or document contents..."
            className="pl-9"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length !== 1 ? 's' : ''}
          {query && <span> for &ldquo;{query}&rdquo;</span>}
        </p>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Search}
              title={query ? 'No matching records found' : 'Enter search terms to begin'}
              description={query ? 'Try searching by CNR number, party name, or legal petition keywords.' : 'Type keywords in the search bar above.'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="group block rounded-xl border bg-card p-4 transition-all hover:border-brand hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand font-bold text-xs uppercase">
                  PDF
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-brand">
                      {doc.originalFilename}
                    </h3>
                    {doc.documentType && (
                      <Badge variant="outline" className="text-[11px]">
                        {doc.documentType}
                      </Badge>
                    )}
                  </div>

                  {doc.case && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 text-brand" />
                      <span className="font-medium text-foreground">{doc.case.title}</span>
                      {doc.case.caseNumber && <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">{doc.case.caseNumber}</span>}
                    </div>
                  )}

                  {doc.excerpt && (
                    <p className="mt-1.5 text-xs text-muted-foreground bg-secondary/40 p-2 rounded-md font-mono line-clamp-2">
                      &ldquo;{doc.excerpt}&rdquo;
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1">
                    {doc.matchedFields.map((field) => (
                      <Badge key={field} variant="secondary" className="text-[11px] font-normal">
                        Matched: {field}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">
                      Uploaded {formatRelativeTime(doc.uploadedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
