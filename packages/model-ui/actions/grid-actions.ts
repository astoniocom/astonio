import {Record} from '@astonio/core';
import {GridComponent} from '@astonio/ui';
import {Injector, ChangeDetectorRef} from '@angular/core';
import {Subscription} from 'rxjs';

export class GridActions {
  protected cdr:ChangeDetectorRef;
  private focusedRowChangedSubscription:Subscription;
  protected recordSelected:boolean;

  constructor(protected grid:GridComponent, protected injector:Injector) {
    this.cdr = injector.get(ChangeDetectorRef);

    this.focusedRowChangedSubscription = this.grid.focusedRowChanged.subscribe(() => {
      this.updateIsRecordSelected();
      this.cdr.detectChanges();
    });
  }

  private updateIsRecordSelected() {
    this.recordSelected = false;
    for (let row of this.grid.getSelectedData()) {
      if (row instanceof Record) {
        this.recordSelected = true;
        return;
      }
    };
  }

  destroy() {
    this.focusedRowChangedSubscription.unsubscribe();
  }
}