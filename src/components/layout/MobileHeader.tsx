import Link from "next/link";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4">
      <Link href="/" className="font-heading text-xl font-bold text-trust-blue">
        명당노트
      </Link>
      <nav className="flex items-center gap-4 text-sm font-medium">
        <Link href="/" className="hover:text-trust-blue">홈</Link>
        <Link href="/pricing" className="hover:text-trust-blue">요금제</Link>
        <Link href="/report/1" className="hover:text-trust-blue">내 리포트</Link>
        <Link href="/login" className="hover:text-trust-blue">로그인</Link>
      </nav>
    </header>
  );
}
