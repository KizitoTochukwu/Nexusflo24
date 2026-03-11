

# Fix Sidebar Toggle Button Visibility

## Problem
The sidebar toggle button at line 67 shares a 56px-wide container (`w-14`) with the logo when collapsed. With `px-3` padding (12px each side), only ~32px remains — not enough for both elements side by side. The button gets clipped/hidden.

## Solution
In **`src/components/dashboard/DashboardLayout.tsx`** (line 63), change the header div layout:
- When sidebar is **collapsed**: center the toggle button and hide the logo
- When sidebar is **open**: keep current layout (logo left, close button right)

```tsx
<div className="flex h-14 items-center justify-between px-3">
  {sidebarOpen && (
    <Link to="/" className="flex items-center">
      <SidebarLogo collapsed={!sidebarOpen} className="rounded" />
    </Link>
  )}
  <button
    onClick={() => setSidebarOpen(!sidebarOpen)}
    className={`rounded p-1 text-primary-foreground/60 hover:text-primary-foreground ${
      !sidebarOpen ? "mx-auto" : ""
    }`}
  >
    {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
  </button>
</div>
```

Single file change, ~5 lines modified.

