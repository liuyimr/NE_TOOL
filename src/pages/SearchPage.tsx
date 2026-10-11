import { useCallback, useState } from 'react';
import SearchBar from '@/components/search/SearchBar';
import SearchResults from '@/components/search/SearchResults';
import { search } from '@/lib/search';
import type { SearchHit } from '@/lib/search';

/**
 * 搜索页：防抖输入 → Fuse 检索 → 分组结果（工具 + 速查内容）
 */
export default function SearchPage(): JSX.Element {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);

  const handleChange = useCallback((q: string) => {
    setQuery(q);
    setHits(q ? search(q, 40) : []);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <SearchBar onDebouncedChange={handleChange} autoFocus />
      {query ? (
        <SearchResults hits={hits} query={query} />
      ) : (
        <p className="py-8 text-center text-sm text-muted">
          输入关键词，搜索工具名、端口号、功能码、线序等
        </p>
      )}
    </div>
  );
}
