'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, FileText, X, Building2 } from 'lucide-react';
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

      const res = await fetch(
        `${API_URL}/api/v1/search?q=${encodeURIComponent(q)}`,
        {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }
      );

      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.data?.results || []);
    } catch (err: unknown) {
      console.error('Search query error:', err);
      toast.error('We couldn’t complete that search. Please try again.');
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
    <div className="page-shell space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Search anything
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Find cases, parties, or specific text inside any document in your workspace.
        </p>
      </header>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try a case number, party name, or a phrase from the document…"
            className="pl-10"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {query && (
        <p className="text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? 'result' : 'results'} for{' '}
          <span className="font-medium text-foreground">“{query}”</span>
        </p>
      )}

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-4">
            <EmptyState
              icon={Search}
              title={
                query ? 'No matching records found' : 'Start typing to search'
              }
              description={
                query
                  ? 'Try a different spelling, a CNR number, a party name, or a phrase you remember.'
                  : 'Search by case number, CNR, party, or text from any document.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="group block rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 text-brand" />
                      <span className="font-medium text-foreground">
                        {doc.case.title}
                      </span>
                      {doc.case.caseNumber && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground/80">
                          {doc.case.caseNumber}
                        </span>
                      )}
                    </div>
                  )}

                  {doc.excerpt && (
                    <p className="mt-1 line-clamp-2 rounded-md bg-secondary/50 p-2 text-xs text-muted-foreground">
                      “{doc.excerpt}”
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {doc.matchedFields.map((field) => (
                      <Badge
                        key={field}
                        variant="secondary"
                        className="text-[11px] font-normal"
                      >
                        Matched: {field}
                      </Badge>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatRelativeTime(doc.uploadedAt)}
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