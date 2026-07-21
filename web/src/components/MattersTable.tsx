"use client";

import { createColumnHelper } from "@tanstack/table-core";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CaseTypeBadge, CountryBadge } from "@/components/CaseTypeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import type { Matter } from "@/lib/types";
import { linkMatter } from "@/lib/ui-classes";
import { EMPTY_CELL, formatDate } from "@/lib/utils";

const columnHelper = createColumnHelper<Matter>();

export function MattersTable({ matters }: { matters: Matter[] }) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [caseTypeFilter, setCaseTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [postureFilter, setPostureFilter] = useState("");

  const statuses = useMemo(() => [...new Set(matters.map((m) => m.status).filter(Boolean))].sort(), [matters]);
  const caseTypes = useMemo(
    () => [...new Set(matters.map((m) => m.caseType).filter(Boolean))].sort(),
    [matters],
  );
  const countries = useMemo(
    () => [...new Set(matters.map((m) => m.country).filter((c): c is string => Boolean(c)))].sort(),
    [matters],
  );
  const postures = useMemo(
    () => [...new Set(matters.map((m) => m.posture).filter((p): p is string => Boolean(p)))].sort(),
    [matters],
  );

  const filteredData = useMemo(() => {
    return matters.filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (caseTypeFilter && m.caseType !== caseTypeFilter) return false;
      if (countryFilter && m.country !== countryFilter) return false;
      if (postureFilter && m.posture !== postureFilter) return false;
      return true;
    });
  }, [matters, statusFilter, caseTypeFilter, countryFilter, postureFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("matterId", {
        header: "Matter ID",
        cell: (info) => (
          <Link className={linkMatter} href={`/matters/${info.getValue()}`}>
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor((row) => row.title || row.clientName, {
        id: "title",
        header: "Title",
        cell: (info) => (
          <Link className={linkMatter} href={`/matters/${info.row.original.matterId}`}>
            {info.getValue() || EMPTY_CELL}
          </Link>
        ),
      }),
      columnHelper.accessor("caseType", {
        header: "Case type",
        cell: (info) => <CaseTypeBadge caseType={info.getValue()} />,
      }),
      columnHelper.accessor((row) => row.country ?? "", {
        id: "country",
        header: "Country",
        cell: (info) => <CountryBadge country={info.getValue()} />,
      }),
      columnHelper.accessor((row) => row.posture ?? "", {
        id: "posture",
        header: "Posture",
        cell: (info) => info.getValue() || EMPTY_CELL,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("nextDeadline", {
        header: "Next deadline",
        cell: (info) => {
          const value = info.getValue();
          if (!value) return EMPTY_CELL;
          return (
            <span className="font-medium text-slate-900 tabular-nums">
              {formatDate(value)}
            </span>
          );
        },
      }),
      columnHelper.accessor("assignedAttorney", { header: "Attorney" }),
    ],
    [],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search matters…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <select
          aria-label="Filter matters by status"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter matters by case type"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={caseTypeFilter}
          onChange={(e) => setCaseTypeFilter(e.target.value)}
        >
          <option value="">All case types</option>
          {caseTypes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter matters by country"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter matters by posture"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={postureFilter}
          onChange={(e) => setPostureFilter(e.target.value)}
        >
          <option value="">All postures</option>
          {postures.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer px-4 py-3 select-none hover:text-slate-700"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a, button, input, select, label")) return;
                    router.push(`/matters/${row.original.matterId}`);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  No matters match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          Showing{" "}
          {filteredData.length === 0
            ? "0"
            : `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–${Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                filteredData.length,
              )}`}{" "}
          of {filteredData.length} matters
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs">
            Rows
            <select
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-white disabled:opacity-50"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-white disabled:opacity-50"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
