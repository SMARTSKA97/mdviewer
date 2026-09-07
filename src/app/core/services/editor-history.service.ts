import { Injectable } from '@angular/core';

interface DocumentHistoryStack {
  past: string[];
  future: string[];
}

@Injectable({
  providedIn: 'root'
})
export class EditorHistoryService {
  private readonly MAX_STACK_DEPTH = 100;
  private historyMap = new Map<string, DocumentHistoryStack>();

  private getOrCreateStack(documentId: string): DocumentHistoryStack {
    let stack = this.historyMap.get(documentId);
    if (!stack) {
      stack = { past: [], future: [] };
      this.historyMap.set(documentId, stack);
    }
    return stack;
  }

  pushState(documentId: string, currentContent: string, newContent: string): void {
    if (!documentId || currentContent === newContent) return;

    const stack = this.getOrCreateStack(documentId);

    // Don't push identical consecutive entries
    if (stack.past.length > 0 && stack.past[stack.past.length - 1] === currentContent) {
      // Content already captured
    } else {
      stack.past.push(currentContent);
    }

    // Limit depth to 100
    if (stack.past.length > this.MAX_STACK_DEPTH) {
      stack.past.shift();
    }

    // Clear future redo stack on new edit
    stack.future = [];
  }

  undo(documentId: string, currentContent: string): string | null {
    const stack = this.historyMap.get(documentId);
    if (!stack || stack.past.length === 0) return null;

    const previousContent = stack.past.pop()!;
    stack.future.push(currentContent);

    return previousContent;
  }

  redo(documentId: string, currentContent: string): string | null {
    const stack = this.historyMap.get(documentId);
    if (!stack || stack.future.length === 0) return null;

    const nextContent = stack.future.pop()!;
    stack.past.push(currentContent);

    return nextContent;
  }

  canUndo(documentId: string): boolean {
    const stack = this.historyMap.get(documentId);
    return !!(stack && stack.past.length > 0);
  }

  canRedo(documentId: string): boolean {
    const stack = this.historyMap.get(documentId);
    return !!(stack && stack.future.length > 0);
  }

  clear(documentId: string): void {
    this.historyMap.delete(documentId);
  }
}
