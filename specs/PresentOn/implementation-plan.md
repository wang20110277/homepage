# PresentOn PPT Feature Enhancement Implementation Plan

## Overview

**Estimated Time**: 6-8 hours
**Priority**: High
**Dependencies**: Existing BFF layer architecture, Presenton API

---

## Phase 1: BFF Layer API Extension (2 hours)

### 1.1 Get User PPT List Endpoint

**File**: `src/app/api/ppt/presentations/route.ts`

**Implementation Steps**:
1. Create GET route handler function
2. Call Presenton API: `GET /api/v1/ppt/presentation/all`
3. Data transformation and error handling
4. Return standardized response format

**Code Example**:
```typescript
export async function GET() {
  const response = await fetch(
    `${PRESENTON_BASE_URL}/api/v1/ppt/presentation/all`,
    {
      headers: {
        Authorization: `Bearer ${PRESENTON_API_KEY}`,
      },
    }
  );
  // Handle response...
}
```

### 1.2 Get PPT Details Endpoint

**File**: `src/app/api/ppt/presentations/[id]/route.ts`

**Implementation Steps**:
1. Create dynamic route handler function
2. Get presentation id from params
3. Call Presenton API: `GET /api/v1/ppt/presentation/{id}`
4. Return PPT details and slide data

### 1.3 Export PPT Endpoint

**File**: `src/app/api/ppt/presentations/[id]/export/route.ts`

**Implementation Steps**:
1. Create POST route handler function
2. Receive export format parameter (pptx/pdf)
3. Call Presenton API: `POST /api/v1/ppt/presentation/export`
4. Return download link

---

## Phase 2: Client API Functions (30 minutes)

### 2.1 Update Type Definitions

**File**: `src/lib/api/ppt.ts`

Add interface types:
```typescript
export interface PresentationListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  slideCount: number;
  thumbnail?: string;
}

export interface PresentationDetail {
  id: string;
  title: string;
  createdAt: string;
  slides: SlideContent[];
  template?: string;
  language?: string;
}

export interface SlideContent {
  index: number;
  title?: string;
  content: Record<string, unknown>;
  thumbnail?: string;
}

export interface ExportResult {
  downloadUrl: string;
  format: 'pptx' | 'pdf';
  expiresAt?: string;
}
```

### 2.2 Add API Functions

```typescript
// Get all PPTs
export async function getPresentations(): Promise<PresentationListItem[]>

// Get PPT details
export async function getPresentationById(id: string): Promise<PresentationDetail>

// Export PPT
export async function exportPresentation(
  id: string,
  format: 'pptx' | 'pdf'
): Promise<ExportResult>
```

---

## Phase 3: "My Presentations" List Page (2 hours)

### 3.1 Create Page Structure

**File**: `src/app/tools/my-presentations/page.tsx`

**Page Component Structure**:
```
MyPresentationsPage
├── Header (title and description)
├── Loading State (skeleton)
├── Error State (error prompt)
├── Empty State (guide to create PPT)
└── Grid Layout
    └── PresentationCard (CometCard wrapper)
        ├── Thumbnail
        ├── Title
        ├── Metadata (time, page count)
        └── Action Buttons
```

**Key Implementation**:
1. Use `useEffect` to fetch data on component mount
2. Use `useState` to manage loading, error, data states
3. Use CometCard to wrap each PPT card
4. Responsive grid layout (1 column mobile, 2-3 columns desktop)
5. Click card uses `useRouter` for navigation

### 3.2 Card Design

```tsx
<CometCard rotateDepth={8} translateDepth={8}>
  <div className="cursor-pointer" onClick={() => router.push(`/tools/my-presentations/${ppt.id}`)}>
    <div className="h-40 bg-muted" /> {/* thumbnail */}
    <div className="p-4">
      <h3 className="font-semibold">{ppt.title}</h3>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{formatDate(ppt.createdAt)}</span>
        <span>•</span>
        <span>{ppt.slideCount} slides</span>
      </div>
    </div>
  </div>
</CometCard>
```

---

## Phase 4: PPT Preview Page (2.5 hours)

### 4.1 Create Page Structure

**File**: `src/app/tools/my-presentations/[id]/page.tsx`

**Page Component Structure**:
```
PresentationPreviewPage
├── Header
│   ├── Back Button
│   ├── Title
│   └── Download Buttons
├── Loading State
├── Error State
└── Content Area
    ├── Slide Navigator (sidebar or bottom)
    └── Slide Preview (main content area)
```

### 4.2 Slide Preview Component

**Implementation Points**:
1. Fetch PPT details and all slides
2. Slide selector (thumbnail list)
3. Current slide large image display
4. Previous/Next navigation
5. Keyboard shortcut support (left/right arrows)

### 4.3 Download Functionality

```tsx
const handleDownload = async (format: 'pptx' | 'pdf') => {
  setIsExporting(true);
  try {
    const result = await exportPresentation(id, format);
    // Trigger download
    window.open(result.downloadUrl, '_blank');
    toast.success(`${format.toUpperCase()} file is ready`);
  } catch (error) {
    toast.error('Export failed, please retry');
  } finally {
    setIsExporting(false);
  }
};
```

### 4.4 Slide Content Rendering

Based on Presenton's slide content structure, render:
- Title text
- Body content
- Images (if any)
- Layout styles

---

## Phase 5: Navigation Bar Update (30 minutes)

### 5.1 Modify Navigation Configuration

**File**: `src/components/site-header.tsx`

**Changes**:
```typescript
// Before
const navigation = [
  { name: "PPT Generator", href: "/tools/ppt-generator", icon: Presentation },
  { name: "OCR Recognition", href: "/tools/ocr", icon: ScanText },
  { name: "Tianyancha", href: "/tools/tianyancha", icon: Building2 },
];

// After
const navigation = [
  { name: "PPT Generator", href: "/tools/ppt-generator", icon: Presentation },
  { name: "My Presentations", href: "/tools/my-presentations", icon: FolderOpen },
];
```

### 5.2 Import New Icon

```typescript
import { LayoutDashboard, Presentation, FolderOpen, Menu } from "lucide-react";
```

---

## Phase 6: Testing and Optimization (1 hour)

### 6.1 Functional Testing

- [ ] PPT list loads correctly
- [ ] Pagination/scroll loading works
- [ ] Card click navigation is correct
- [ ] Preview page data displays
- [ ] Slide switching functionality
- [ ] Download button works properly
- [ ] Navigation bar links are correct

### 6.2 Error Handling Testing

- [ ] Network error handling
- [ ] Empty data state
- [ ] Invalid ID handling
- [ ] Export failure handling

### 6.3 Responsive Testing

- [ ] Mobile layout
- [ ] Tablet layout
- [ ] Desktop layout

### 6.4 Code Quality Check

```bash
pnpm run lint
pnpm run typecheck
```

---

## File Change List

### New Files

1. `src/app/api/ppt/presentations/route.ts` - Get PPT list API
2. `src/app/api/ppt/presentations/[id]/route.ts` - Get PPT details API
3. `src/app/api/ppt/presentations/[id]/export/route.ts` - Export PPT API
4. `src/app/tools/my-presentations/page.tsx` - My Presentations list page
5. `src/app/tools/my-presentations/[id]/page.tsx` - PPT preview page

### Modified Files

1. `src/lib/api/ppt.ts` - Add client API functions and types
2. `src/components/site-header.tsx` - Update navigation configuration

### Optional Files

1. `src/components/ppt/slide-preview.tsx` - Slide preview component (if extracted)
2. `src/components/ppt/presentation-card.tsx` - PPT card component (if extracted)

---

## Risks and Considerations

### Technical Risks

1. **Presenton API Response Format**: Need to confirm actual returned data structure, may need to adjust type definitions
2. **Slide Content Rendering**: Presenton's slide content structure is complex, may need to simplify or extend rendering logic
3. **Download Link Expiration**: Need to handle link expiration cases

### User Experience Considerations

1. **Large Amount of PPT Loading**: Consider pagination or virtual scrolling
2. **Large PPT Preview**: Lazy load slide content
3. **Download Wait Time**: Provide progress feedback

### Security Considerations

1. **API Authentication**: Ensure all BFF layer calls carry correct authentication information
2. **Data Isolation**: Verify users can only access their own PPTs
3. **Download Link Security**: Links should have time limits and permission verification

---

## Implementation Order Recommendation

1. **Day 1 Morning** (3 hours)
   - Phase 1: BFF Layer API Extension
   - Phase 2: Client API Functions

2. **Day 1 Afternoon** (3 hours)
   - Phase 3: "My Presentations" List Page
   - Phase 5: Navigation Bar Update

3. **Day 2 Morning** (3 hours)
   - Phase 4: PPT Preview Page

4. **Day 2 Afternoon** (1 hour)
   - Phase 6: Testing and Optimization

---

## Future Iteration Plan

### Phase 2 Feature Enhancement
- PPT delete functionality
- PPT search and filtering
- Pagination loading
- Batch operations

### Phase 3 Advanced Features
- PPT online editing
- Version history
- Collaboration sharing
- Template management
