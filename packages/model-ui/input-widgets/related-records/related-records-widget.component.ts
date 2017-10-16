import {EventEmitter, Component,Injector, HostListener, TemplateRef, ViewContainerRef,NgZone, ViewEncapsulation, ContentChild, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, Input, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {Record, RecordModel, ListModel, Backend, RowDoesNotExistError, QuerySet, CharField, Q, RelatedRecords} from '@astonio/core';
import {ListWindow, ListWindowConstructorParams} from '../../windows/base/list-window/list-window';
import {BaseInputWidgetComponent, PopupDispatcher, GroupFocusEvent, ItemsListComponent, WindowsManager, Window} from '@astonio/ui';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import { TemplatePortal } from '@angular/cdk/portal';
import {ConnectedOverlayDirective, OverlayRef, Overlay, OverlayState, PositionStrategy } from '@angular/cdk/overlay';
import {ModelWindowsDispatcher} from '../../services/model-windows-dispatcher/model-windows-dispatcher';
import {Observable, Subject, Subscription} from 'rxjs';
import {RelatedRecordsWindow} from '../../windows/related-records-window/related-records-window';
import {AstonioUIConfigService} from '@astonio/ui';
import {AstonioModelUIConfigService} from '../../services/config/config.service';

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => RelatedRecordsWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-related-records',
  templateUrl: './related-records-widget.html',
  //styleUrls: ['./related-records-widget.css'],
  providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR, PopupDispatcher],
  inputs: ['value', 'errors', 'disabled', 'id:input_id'],
  outputs: ['finished'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[attr.tabindex]': 'isHostAsInput() ? 0 : ""',
    '(keydown)': 'onHostKeyDown($event)', 
  }
})
export class RelatedRecordsWidgetComponent extends BaseInputWidgetComponent implements OnInit, AfterViewInit, OnDestroy { 
  @Input() width:string = '100%';
  @Input() class:string = '';
  @Input() dropdownLoadLimit = 10;
  protected backend:Backend;
  protected wm:WindowsManager;
  protected parentWindow:Window<any, any>;
  
  @ViewChild("panel") private panelElement: ElementRef;
  @ViewChild("itemsList") private itemsList: ItemsListComponent;
  @ViewChild("dropdownTemplate") private dropdownTemplate:TemplateRef<any>;
  elementRef:ElementRef;

  protected qs:QuerySet;
  recordsLoadedTo:number;
  protected mwd:ModelWindowsDispatcher;
  choices:[Record, string][];
  isLoading:boolean = false;
  private valueLoadedSubscription:Subscription;
  protected uiConfigService:AstonioUIConfigService;
  protected configService:AstonioModelUIConfigService;
  

  set value(val:RelatedRecords) {
    if (val === this._value)
      return;
    if (this.valueLoadedSubscription)
      this.valueLoadedSubscription.unsubscribe();
    super.value = val;

    if (val instanceof RelatedRecords) {
      this.valueLoadedSubscription = val.loaded.subscribe(() => {
        this.cdr.detectChanges();
      })
    }
  }

  
  get value():RelatedRecords {
    return super.value;
  }

  private popupDispatcher:PopupDispatcher;
  private portal:TemplatePortal<any>;
  private overlayRef:OverlayRef;
  private overlay: Overlay;
  private _zone: NgZone;
  private clickOutsideSubscription:Subscription;

  constructor (protected vcr:ViewContainerRef) {
    super(vcr);
    this.popupDispatcher = this.injector.get(PopupDispatcher);
    this.mwd = this.injector.get(ModelWindowsDispatcher);
    this.elementRef = this.injector.get(ElementRef);
    this.backend = this.injector.get(Backend);
    this.overlay = this.injector.get(Overlay);
    this.wm = this.injector.get(WindowsManager);
    this.parentWindow = this.injector.get(Window, null);
    this._zone = this.injector.get(NgZone);
    this.clickOutsideSubscription = this.popupDispatcher.clickedOuside.subscribe(() => {
      this.showOptions(false);
    });
    this.uiConfigService = this.injector.get(AstonioUIConfigService);
    this.configService = this.injector.get(AstonioModelUIConfigService);
  }



  ngOnInit() {

  }

  addChoices(records:Record[], replace=true) {
    if (replace)
      this.choices = [];

    for (let record of records) {
      var repr = ""+record;
      
      this.choices.push([record, repr]);
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (!this.disabled) {
      if (this.startWithChar) {
        this.showOptions(true);
        this.setFocus();
      }
      else if (this.startWithKey || this.focusAfterInit) {
        this.setFocus();
      }
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.clickOutsideSubscription.unsubscribe();
    if (this.valueLoadedSubscription)
      this.valueLoadedSubscription.unsubscribe();
    this.showOptions(false);
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
  
  private getRepr():string {
    if (!this.value)
      return '';

    if (!this.value.isLoaded) {
      return 'Not loaded';
    }
    else {
      return ''+this.value.items.length+' record(s)';
    }
  }

  onContainerKeyDown(event:KeyboardEvent):boolean|void {
    var keyCode = event.keyCode;
    if (this.popupDispatcher.opened && [38, 40, 13].indexOf(keyCode) !== -1) {
      return false;
    }
  }

  onHostKeyDown(event:KeyboardEvent) {
    if (event.keyCode == 27 /* Esc */ && this.popupDispatcher.opened) {
      this.showOptions(false);
      this.setFocus();
    }

    if (event.keyCode == 40 /* Down */ && !this.popupDispatcher.opened) {
      this.showOptions(true);
    }
  }

  isHostAsInput() {
    return !this.disabled && this.isValueSet();
  }
  
  setFocus() {
    if (!this.componentInit || this.disabled) //!this.popupDispatcher.opened ||
      return;
    this.elementRef.nativeElement.focus();
  }

  expandRecords(show:boolean) {
    this.isLoading = true;
    this.value.getRecords().subscribe(records => {
      this.addChoices(records, true);
      this.isLoading = false;
      this._zone.run(() => {});
      //this.cdr.detectChanges();
    })
    this.showOptions(show);
  }

  showOptions(show:boolean) {
    if (show) {
      if (!this.popupDispatcher.opened) {
        this.popupDispatcher.open();
        if (!this.overlayRef) {
          this.createOverlay();
        }
        else {
          this.overlayRef.getState().width = this.getHostWidth();
          this.overlayRef.updateSize();
        }
        if (!this.overlayRef.hasAttached())
          this.overlayRef.attach(this.portal);
        this.setFocus();
      }
    }
    else if (this.popupDispatcher.opened) {
      this.popupDispatcher.close();
      this.overlayRef.detach();
    }
    
    if (this.componentInit)
      this.cdr.detectChanges();
    //this._zone.run(()=>{});
  }

  createOverlay() {
    this.portal = new TemplatePortal(this.dropdownTemplate, this.vcr);
    this.overlayRef = this.overlay.create(this.getOverlayConfig());
  }

  getOverlayConfig():OverlayState {
    const overlayState = new OverlayState();
    overlayState.positionStrategy = this.getOverlayPosition();
    overlayState.width = this.getHostWidth();
    overlayState.direction = 'ltr';
    overlayState.minWidth = 100;
    //overlayState.height = 250;
    //overlayState.scrollStrategy = this._scrollStrategy();
    return overlayState;
  }

  getHostWidth(): number {
    return this.elementRef.nativeElement.getBoundingClientRect().width;
  }

  getOverlayPosition():PositionStrategy  {
    var _positionStrategy =  this.overlay.position().connectedTo(
      this.elementRef,
      {originX: 'start', originY: 'bottom'}, {overlayX: 'start', overlayY: 'top'})
      .withFallbackPosition(
          {originX: 'start', originY: 'top'}, {overlayX: 'start', overlayY: 'bottom'}
      );
    return _positionStrategy;
  }

  onFocusChanged($event:GroupFocusEvent) {
    if (!this.panelElement)
      return;
    let scrollTop = this.panelElement.nativeElement.scrollTop; //scrollTop
    let itemPos = $event.element.offsetTop;
    let panelHeight = this.panelElement.nativeElement.clientHeight; // clientHeight
    let itemHeight = $event.element.clientHeight; //clientHeight
    if (itemHeight > panelHeight)
      itemHeight = 10;
    if (itemPos + itemHeight > scrollTop + panelHeight)
      this.panelElement.nativeElement.scrollTop = itemPos;
    else if (itemPos < scrollTop)
      this.panelElement.nativeElement.scrollTop = itemPos - panelHeight + itemHeight;


    ///
    /*if ($event.item === this.choices[this.choices.length-1]) {
      var from = this.recordsLoadedTo+1;
      var to = from + this.dropdownLoadLimit;
      this.recordsLoadedTo = to;
      this.qs.limit(from, to).getRows().map(rows=> {
        var records:Record[] = [];
        rows.forEach(row => {
          if (row instanceof Record)
            records.push(row);
        });
        return records;
      })
      .subscribe(records => {
        this.addChoices(records, false);
        this._zone.run(()=>{});
      })
    }*/
  }

  openRelatedRecordsWindow() {
    var wnd = new RelatedRecordsWindow(this.wm, this.parentWindow, {relatedRecords:this.value, edit: !this.disabled});
  }
}
