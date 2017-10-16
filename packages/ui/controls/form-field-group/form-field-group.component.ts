import {Component, ChangeDetectionStrategy, ViewChild, ElementRef, Input, AfterViewInit, OnDestroy, ViewContainerRef,
  ChangeDetectorRef} from '@angular/core';
import {FrameService} from '../../windows/frame.service'
import {Subscription} from 'rxjs';

@Component({
  selector: 'ast-form-field-group',
  templateUrl: './form-field-group.html',
//  styleUrls: ['./model-form-field-group.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'style': 'display: block'
  }
})
export class FormFieldGroupComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') elementView: ElementRef;
  @Input() minEditSize:number = 0.5;
  @Input() maxEditSize:number = 0.8;
  @Input() inlineFromWidth: number = 300;
  @Input() inlineStrength: number = 2000;
  labelSize = '';
  controlSize = '';
  protected frameChangedSubscription:Subscription;

  constructor(protected vcr:ViewContainerRef, protected frameService:FrameService, protected cdr:ChangeDetectorRef) {
    this.frameChangedSubscription = frameService.changed.subscribe(event => {
      this.updateSizes();
    });
  }

  ngAfterViewInit() {
    this.updateSizes();
  }

  updateSizes(st=0) {
    var containerWidth = this.elementView.nativeElement.clientWidth;
    //console.log(containerWidth);
    if (containerWidth > this.inlineFromWidth) {
      var persent = (containerWidth-this.inlineFromWidth) / (this.inlineStrength-this.inlineFromWidth);
      var correctedPercent = this.minEditSize + ( (this.maxEditSize-this.minEditSize) * persent * (this.inlineStrength/containerWidth));
      //var editSize = ((maxEditSize-minEditSize) * correctedPercent) + minEditSize;// %
      var editSize = containerWidth * correctedPercent;// %
      //console.log(''+persent + ' '+correctedPercent+ ' ' + editSize);
      this.controlSize = editSize-1+'px';
      this.labelSize = ''+(containerWidth - editSize)+'px';
    }
    else {
      this.controlSize = containerWidth+'px';
      this.labelSize = containerWidth+'px';
    }

    this.cdr.detectChanges();

    if (st==0) { // TODO разобраться, почему при уменьшении размера окна не всегда возвращается правильный containerWidth
      setTimeout(() => {
        this.updateSizes(1);
      })
      
    }
    //this.labelSize = containerWidth > 350 ? 20 : 100;
    //this.controlSize = containerWidth > 350 ? 80 : 100;
    
  }

  ngOnDestroy() {
    this.frameChangedSubscription.unsubscribe();
  }
}