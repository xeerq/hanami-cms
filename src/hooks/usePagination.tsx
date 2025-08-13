import { useState, useMemo } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationControls {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
}

export const usePagination = (
  totalItems: number,
  initialPageSize: number = 10
): PaginationControls => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);
  
  const controls = useMemo(() => ({
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    setPage: (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
      }
    },
    setPageSize: (newPageSize: number) => {
      setPageSize(newPageSize);
      setPage(1); // Reset to first page when changing page size
    },
    nextPage: () => {
      if (page < totalPages) {
        setPage(page + 1);
      }
    },
    previousPage: () => {
      if (page > 1) {
        setPage(page - 1);
      }
    },
    firstPage: () => setPage(1),
    lastPage: () => setPage(totalPages),
  }), [page, pageSize, totalPages, totalItems]);

  return controls;
};

export function usePaginatedData<T>(
  data: T[],
  pagination: PaginationControls
): T[] {
  return useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, pagination.page, pagination.pageSize]);
}