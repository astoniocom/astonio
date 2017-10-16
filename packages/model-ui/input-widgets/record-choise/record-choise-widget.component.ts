import {EventEmitter, Component,Injector, HostListener, TemplateRef, ViewContainerRef,NgZone, ViewEncapsulation, ContentChild, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, Input, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {Record, RecordModel, ListModel, Backend, RowDoesNotExistError, QuerySet, CharField, Q} from '@astonio/core';
import {ListWindow, ListWindowConstructorParams} from '../../windows/base/list-window/list-window';
import {BaseInputWidgetComponent, PopupDispatcher, GroupFocusEvent, ItemsListComponent, WindowsManager, Window} from '@astonio/ui';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import { TemplatePortal } from '@angular/cdk/portal';
import {ConnectedOverlayDirective, OverlayRef, Overlay, OverlayState, PositionStrategy } from '@angular/cdk/overlay';
import {ModelWindowsDispatcher} from '../../services/model-windows-dispatcher/model-windows-dispatcher';
import {Observable, Subject, Subscription} from 'rxjs';
import {AstonioUIConfigService} from '@astonio/ui';
import {AstonioModelUIConfigService} from '../../services/config/config.service';

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => RecordChoiseWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-record-choise',
  templateUrl: './record-choise-widget.html',
//  styleUrls: ['./record-choise-widget.css'],
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
export class RecordChoiseWidgetComponent extends BaseInputWidgetComponent implements OnInit, AfterViewInit, OnDestroy { 
  @Input() models:string[] = []; // Какого типа доступны модели для выбора record
  @Input() list:string;
  protected listModel:ListModel;
  @Input() listWindow:typeof ListWindow; // Окно выбора записи
  @Input() width:string = '100%';
  @Input() class:string = '';
  @Input() dropdownLoadLimit = 10;
  protected backend:Backend;
  protected wm:WindowsManager;
  protected parentWindow:Window<any, any>;
  protected uiConfigService:AstonioUIConfigService;
  protected configService:AstonioModelUIConfigService;
  /*private _choices: [any, string][];
  @Input() set choices(val:[any, string][]) {
    if (val === this._choices)
      return;
    this._choices = val;

    this.updateRepr();
  };
  get choices():[any, string][] {
    return this._choices;
  }

  filteredChoices:[any, string][];*/
  
  @ViewChild("inputElement") private inputElement: ElementRef;
  @ViewChild("panel") private panelElement: ElementRef;
  @ViewChild("itemsList") private itemsList: ItemsListComponent;
  @ViewChild("dropdownTemplate") private dropdownTemplate:TemplateRef<any>;
  elementRef:ElementRef;
  repr:string = "";
  seekValue = "";
  protected qs:QuerySet;
  recordsLoadedTo:number;
  protected mwd:ModelWindowsDispatcher;
  choices:[Record, string][];
  inputChanged:Subject<string> = new Subject();
  dropdownOpened:Subject<boolean> = new Subject();
  isLoading:boolean = false;
  

  set value(val:Record) {
    if (val === this._value)
      return;

    super.value = val;
    this.updateRepr();
  }

  
  get value():Record {
    return super.value;
  }

  private popupDispatcher:PopupDispatcher;
  private portal:TemplatePortal<any>;
  private overlayRef:OverlayRef;
  private overlay: Overlay;
  private _zone: NgZone;
  private trackSubscription:Subscription;
  private clickOutsideSubscription:Subscription;
  private recordSavedNotifSubscription:Subscription;

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

    this.recordSavedNotifSubscription = this.backend.recordSavedNotifications.subscribe(ev => {
      if (this.value && this.value.__director__.isFull && this.value.__director__.fitLookup(ev.lookupData)) {
        if (ev.initiatorId !== this.value.__director__.uid) {
          this.value.__director__.getData(true).subscribe(record => {
            this.updateRepr();
          });
        }
        else {
          this.updateRepr();
        }
      }
    });
  }



  ngOnInit() {
    if (!this.disabled && this.startWithChar) {
      this.seekValue = this.startWithChar;
    }

    if (!this.list) {
      throw new Error("Property 'table' must be specified for RecordChoiceWidgetComponent");
    }

    this.listModel = this.backend.getListModel(this.list);

    this.trackSubscription = Observable.merge(this.inputChanged.debounceTime(400).distinctUntilChanged().map(val => {this.showOptions(true); return val}), this.dropdownOpened.filter(val => val && !this.choices).map(val => ""))
    .switchMap(seekValue => {
      this.isLoading = true;
      this.cdr.detectChanges();
      this.qs = this.listModel.getQueryset();

      if (seekValue && seekValue.length) {
        var seekParts = seekValue.split(' ');
        var q0 = new Q();
        for (let field of this.listModel.getDbFields()) {
          if (!(field instanceof CharField))
            continue;

          var q = new Q();
          
          for (let seekPart of seekParts) {
            var cond = {};
            cond[field.name+'__icontains'] = seekPart;

            q = q.AND(cond);
          }
          q0 = q0.OR(q);
          
        }
        this.qs = this.qs.filter(q0);
      }
    
      this.recordsLoadedTo = this.dropdownLoadLimit;
      return Observable.zip(this.qs.limit(0, this.recordsLoadedTo).getRows(), Observable.of(seekValue));
    }).map((res):[Record[], string] => {
      var rows = res[0];
      var seekValue = res[1];

      var records:Record[] = [];
      rows.forEach(row => {
        if (row instanceof Record)
          records.push(row);
      })
      return [records, seekValue];
    }).subscribe((res) => {
      var records = res[0];
      var seekValue = res[1];
      this.addChoices(records, seekValue, true);
      this.isLoading = false;
      this.cdr.markForCheck();
      this._zone.run(() => {});
    });
  }

  addChoices(records:Record[], seekValue:string, replace=true) {
    if (replace)
      this.choices = [];

    if (seekValue && seekValue.length)
      var re = new RegExp(seekValue.replace(' ', '|'), "gi");

    for (let record of records) {
      var repr = ""+record;
      if (re)
        repr = repr.replace(re, (str)=> "<strong>"+str+"</strong>")
      
      this.choices.push([record, repr]);
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (!this.disabled) {
      if (this.startWithChar) {
        this.showOptions(true);
        this.setFocus(false);
      }
      else if (this.startWithKey || this.focusAfterInit) {
        this.setFocus(true);
      }
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.trackSubscription.unsubscribe();
    this.clickOutsideSubscription.unsubscribe();
    this.recordSavedNotifSubscription.unsubscribe();
    this.showOptions(false);
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
  
  private updateRepr() {
    if (this.isValueSet() && this.value instanceof Record) {
      this.repr = ''+this.value;
    }
    else {
      this.repr = '';
    }
    if (this.componentInit)
      this.cdr.detectChanges();
  }

  onContainerKeyDown(event:KeyboardEvent):boolean|void {
    var keyCode = event.keyCode;
    if (this.popupDispatcher.opened && [38, 40, 13].indexOf(keyCode) !== -1) {
      return false;
    }

    if (this.inputElement && this.inputElement.nativeElement == document.activeElement && [37, 39].indexOf(keyCode) !== -1) {
      return false;
    }
  }

  onInput() {
    this.inputChanged.next(this.seekValue);
    /*if (this.seekValue && this.seekValue.length) {
      this.showOptions(true);
      setTimeout(() => {
        if (this.itemsList) {
          this.itemsList.focusItem(this.choices[0]);
        }
      });
    }
    else 
      this.showOptions(false);*/
  }

  onHostKeyDown(event:KeyboardEvent) {
    if (event.keyCode == 27 /* Esc */ && this.popupDispatcher.opened) {
      this.showOptions(false);
      this.setFocus();
    }

    if (event.keyCode == 40 /* Down */ && !this.popupDispatcher.opened) {
      this.inputChanged.next('');
      this.showOptions(true);
    }

    if (!this.isHostAsInput())
      return;

    if (event.key == "Delete" && !this.disabled && this.isValueSet()) {
      this.removeValue();
    }
    
  }

  isHostAsInput() {
    return !this.disabled && this.isValueSet();
  }
  
  setFocus(select=false) {
    setTimeout(() => {
      if (!this.componentInit || this.disabled) //!this.popupDispatcher.opened ||
        return;

      if (this.inputElement) {
        this.inputElement.nativeElement.focus();
        if (select)
          this.inputElement.nativeElement.select();
      }
      else {
        this.elementRef.nativeElement.focus();
      } 
    });
  }

  

  expandRecords(show:boolean) {
    this.dropdownOpened.next(show);
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
        this.setFocus(false);
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
    if ($event.item === this.choices[this.choices.length-1]) {
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
        this.addChoices(records, this.seekValue, false);
        this._zone.run(()=>{});
        if (this.overlayRef) // Если большой список, чтобы перепозиционировалось, к примеру, на контролом
          this.overlayRef.updatePosition();
      })
    }
  }

  onItemPicked(item) {
    this.value = item[0];
    this.showOptions(false);
    this._zone.run(() => {
      this.setFocus(false);
    });
    this.seekValue = null;
  }

  removeValue() {
    this.value = this.emptyValue;
    this.seekValue = '';
    this.choices = null;
    this.showOptions(false);
    setTimeout(()=>{
      this.setFocus(false);
    })
  }

  _openRecord(event:MouseEvent, record:Record) {
    var edit=!event.shiftKey;
    this.mwd.getRecordWindow(this.value.__director__.model, null, true).subscribe(wndInfo => {
      var clonedRecord = false ? this.value.__director__.clone(true, false, true) : record;
      var wnd = new wndInfo.window(this.wm, null, Object.assign({}, wndInfo.windowOptions, {record:clonedRecord, edit:edit}));
    });
  }

  openRecord(event:MouseEvent) {
    if (!this.isValueSet())
      return;

    /*if (this.value.__director__.isFull) { // Закоментировал, т.к. всё равно должны получать данные, чтобы удостовериться, что такая запись есть
      this._openRecord(event, this.value);
    }
    else {*/
    this.value.__director__.getData(true).catch((error, caught) => {
      if (error instanceof RowDoesNotExistError) 
        alert("Record not found.");
      return Observable.empty();
    }).subscribe(record => {
      this._openRecord(event, this.value);
      this.updateRepr();
    });
    //}
  }

  openChoiceForm() {
    if (!this.listWindow) {
      this.mwd.getListWindow(this.listModel, true).subscribe(wndInfo => {
        this._openChoiceWindow(wndInfo.window, Object.assign({}, wndInfo.windowOptions));
      })
    }
    else {
      this._openChoiceWindow(this.listWindow);
    }
  }

  _openChoiceWindow(listWindow:typeof ListWindow, options:ListWindowConstructorParams<any>={}) {
    options = Object.assign({}, options||{}, {list:this.listModel, choice: "single"});
    var wnd = new listWindow(this.wm, this.parentWindow, options);
    wnd.chosen.subscribe(records => {
      this.value = records[0];
      this.cdr.detectChanges();
      wnd.close().subscribe(() => {});
    });
  }
}
