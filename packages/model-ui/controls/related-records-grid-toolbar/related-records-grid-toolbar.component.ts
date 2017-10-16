import {Component, Input, AfterViewInit, Injector, OnDestroy, ChangeDetectorRef} from '@angular/core';
import {RelatedRecordsGridComponent} from '../related-records-grid/related-records-grid.component';
import {RelatedRecordsGridActions} from '../../actions/related-records-grid-actions';

@Component({
  selector: 'ast-related-records-grid-toolbar',
  templateUrl: './related-records-grid-toolbar.html'
})
export class RelatedRecordsGridToolbarComponent implements AfterViewInit, OnDestroy {
  @Input() grid:RelatedRecordsGridComponent;
  actions:RelatedRecordsGridActions;
  cdr:ChangeDetectorRef;

  constructor(protected injector:Injector) {
    this.cdr = injector.get(ChangeDetectorRef);
  }
  
  ngAfterViewInit() {
    this.actions = new RelatedRecordsGridActions(this.grid, this.injector);
  }

  ngOnDestroy() {
    this.actions.destroy();
  }

  moveDown() {
    this.actions.moveDown();
    this.cdr.detectChanges();
  }

  moveUp() {
    this.actions.moveUp();
    this.cdr.detectChanges();
  }

}