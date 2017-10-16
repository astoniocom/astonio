import {Component, Input, AfterViewInit, Injector, ChangeDetectionStrategy} from '@angular/core';
import {RelatedRecords} from '@astonio/core';
import {WindowComponent} from '@astonio/ui';

@Component({
  templateUrl: './related-records-window.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatedRecordsWindowComponent extends WindowComponent implements AfterViewInit {
  @Input() relatedRecords:RelatedRecords;
  @Input() edit:boolean = true;

  constructor(protected injector:Injector) { //@Inject(forwardRef(() => ModelWindowsDispatcher)) 
    super(injector);
  }

  ngAfterViewInit() {
  }
}
