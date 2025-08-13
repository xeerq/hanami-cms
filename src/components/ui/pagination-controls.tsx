import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PaginationControls } from "@/hooks/usePagination";

interface PaginationControlsProps {
  pagination: PaginationControls;
  totalItems: number;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
}

export const PaginationControlsComponent = ({
  pagination,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
  showPageInfo = true,
}: PaginationControlsProps) => {
  const {
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
  } = pagination;

  const startItem = Math.min((page - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(page * pageSize, totalItems);

  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Brak elementów do wyświetlenia
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center space-x-6 lg:space-x-8">
        {showPageSizeSelector && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Elementów na stronie</p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {showPageInfo && (
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Strona {page} z {totalPages}
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          {startItem}-{endItem} z {totalItems}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={firstPage}
          disabled={!hasPreviousPage}
        >
          <span className="sr-only">Pierwsza strona</span>
          <ChevronFirst className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={previousPage}
          disabled={!hasPreviousPage}
        >
          <span className="sr-only">Poprzednia strona</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber: number;
            
            if (totalPages <= 5) {
              pageNumber = i + 1;
            } else if (page <= 3) {
              pageNumber = i + 1;
            } else if (page >= totalPages - 2) {
              pageNumber = totalPages - 4 + i;
            } else {
              pageNumber = page - 2 + i;
            }
            
            return (
              <Button
                key={pageNumber}
                variant={page === pageNumber ? "default" : "outline"}
                className="h-8 w-8 p-0"
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={nextPage}
          disabled={!hasNextPage}
        >
          <span className="sr-only">Następna strona</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={lastPage}
          disabled={!hasNextPage}
        >
          <span className="sr-only">Ostatnia strona</span>
          <ChevronLast className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};