import { TestBed } from '@angular/core/testing';
import { FrontmatterService } from './frontmatter.service';

describe('FrontmatterService', () => {
  let service: FrontmatterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrontmatterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty frontmatter when content does not start with ---', () => {
    const raw = '# Hello World\nSome text';
    const parsed = service.parse(raw);

    expect(parsed.hasFrontmatter).toBe(false);
    expect(parsed.data).toEqual({});
    expect(parsed.body).toBe(raw);
  });

  it('should parse valid YAML frontmatter properties and tags array', () => {
    const raw = `---
title: My Knowledge Note
tags: [angular, testing, obsidian]
status: draft
---
# Main Heading
Content goes here.`;

    const parsed = service.parse(raw);

    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.data['title']).toBe('My Knowledge Note');
    expect(parsed.data['tags']).toEqual(['angular', 'testing', 'obsidian']);
    expect(parsed.data['status']).toBe('draft');
    expect(parsed.body).toBe('# Main Heading\nContent goes here.');
  });

  it('should parse YAML list items under key', () => {
    const raw = `---
tags:
  - markdown
  - pkms
---
Body text`;

    const parsed = service.parse(raw);

    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.data['tags']).toEqual(['markdown', 'pkms']);
    expect(parsed.body).toBe('Body text');
  });

  it('should stringify frontmatter data back to YAML string', () => {
    const data = { title: 'Test Note', tags: ['v1', 'v2'] };
    const body = 'Body content here.';
    const result = service.stringify(data, body);

    expect(result).toContain('---');
    expect(result).toContain('title: Test Note');
    expect(result).toContain('tags:');
    expect(result).toContain('  - v1');
    expect(result).toContain('  - v2');
    expect(result).toContain('Body content here.');
  });

  it('should update or delete properties dynamically', () => {
    const initial = `---
title: Initial Title
category: draft
---
Body text`;

    const updated = service.updateProperty(initial, 'category', 'published');
    const parsedUpdated = service.parse(updated);
    expect(parsedUpdated.data['category']).toBe('published');

    const deleted = service.updateProperty(updated, 'category', undefined);
    const parsedDeleted = service.parse(deleted);
    expect(parsedDeleted.data['category']).toBeUndefined();
  });
});
