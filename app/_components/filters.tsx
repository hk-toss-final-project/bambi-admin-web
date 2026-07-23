// 관리자 표 화면들이 공통으로 쓰는 조작 UI — 검색창 · 필터 탭.
//
// 사용자 목록·AI 로그 둘 다 "검색어로 거르고, 상태로 좁힌다"가 똑같아서, 톤이 어긋나지
// 않게 여기 모아둔다. 필터링 로직 자체는 각 화면이 자기 데이터에 맞게 하고, 여기선
// 입력 UI만 준다(값과 onChange 를 받는 controlled 컴포넌트).

/** 검색 입력. 목록을 즉시 거르는 용도라 debounce 없이 입력마다 위로 올린다(목록이 작음). */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 sm:w-64"
      />
    </div>
  );
}

/** 상태 필터 탭(세그먼트). 선택된 값은 진하게, 나머지는 옅게. 값 종류는 화면이 정한다. */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={
              selected
                ? "rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** 검색·필터를 다 걸었는데 남는 게 없을 때. EmptyState 와 톤을 맞춘 인라인 안내. */
export function NoMatchState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      {message}
    </div>
  );
}
