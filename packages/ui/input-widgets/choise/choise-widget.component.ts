import {EventEmitter, Component,Injector, HostListener, TemplateRef, ViewContainerRef,NgZone, ViewEncapsulation, ContentChild, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, Input, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {BaseInputWidgetComponent} from '../base-input-widget';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import {PopupDispatcher} from '../../services/popup-dispatcher';
import { TemplatePortal } from '@angular/cdk/portal';
import {ConnectedOverlayDirective, OverlayRef, Overlay, OverlayState, PositionStrategy } from '@angular/cdk/overlay';
import {GroupFocusEvent} from '../../controls/items-group/items-group.component';
import {ItemsListComponent} from '../../controls/items-list/items-list.component';
import {Subscription} from 'rxjs';
import {AstonioUIConfigService} from '../../services/config.service';

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => ChoiseWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-choise',
  templateUrl: './choise-widget.html',
  //styleUrls: ['./choise-widget.css'],
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
export class ChoiseWidgetComponent extends BaseInputWidgetComponent implements OnInit, AfterViewInit, OnDestroy { 
  @Input() width:string = '100%';
  @Input() class:string = '';

  private _choices: [any, string][];
  @Input() set choices(val:[any, string][]) {
    if (val == this._choices)
      return;
    this._choices = val;

    this.updateRepr();
  };
  get choices():[any, string][] {
    return this._choices;
  }

  filteredChoices:[any, string][];
  
  @ViewChild("inputElement") private inputElement: ElementRef;
  @ViewChild("panel") private panelElement: ElementRef;
  @ViewChild("itemsList") private itemsList: ItemsListComponent;
  @ViewChild("dropdownTemplate") private dropdownTemplate:TemplateRef<any>;
  elementRef:ElementRef;
  repr:string = "";
  seekValue = "";

  set value(val:any) {
    if (val === this._value)
      return;

    super.value = val;
    this.updateRepr();
  }

  
  get value():any {
    return super.value;
  }

  private popupDispatcher:PopupDispatcher;
  private portal:TemplatePortal<any>;
  private overlayRef:OverlayRef;
  private overlay: Overlay;
  private _zone: NgZone;
  private clickOutsideSubscription;
  protected configService:AstonioUIConfigService;

  constructor (protected vcr:ViewContainerRef) {
    super(vcr);
    this.popupDispatcher = this.injector.get(PopupDispatcher);
    this.elementRef = this.injector.get(ElementRef);
    this.overlay = this.injector.get(Overlay);
    this.configService = this.injector.get(AstonioUIConfigService);
    this._zone = this.injector.get(NgZone);
    this.clickOutsideSubscription = this.popupDispatcher.clickedOuside.subscribe(() => {
      this.showOptions(false);
    });
  }

  ngOnInit() {
    if (!this.disabled && this.startWithChar) {
      this.seekValue = this.startWithChar;
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
    this.showOptions(false);
    this.clickOutsideSubscription.unsubscribe();
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
  
  private updateRepr() {
    if (this.isValueSet() && this.choices && this.choices.length) {
      for (let choice of this.choices) {
        if (choice[0] == this.value) {
          this.repr = choice[1];
          break;
        }
      }
    }
    else {
      this.repr = '';
    }
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
    if (this.seekValue && this.seekValue.length) {
      this.showOptions(true);
      setTimeout(() => {
        if (this.itemsList) {
          this.itemsList.focusItem(this.filteredChoices[0]);
        }
      });
    }
    else 
      this.showOptions(false);
  }

  onHostKeyDown(event:KeyboardEvent) {
    if (event.keyCode == 27 /* Esc */ && this.popupDispatcher.opened) {
      this.showOptions(false);
      this.setFocus();
    }

    if (event.keyCode == 40 /* Down */ && !this.popupDispatcher.opened) {
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

  showOptions(show:boolean) {
    if (!this.choices || !this.choices.length || this.disabled)
      return;

    if (show) {
      if (this.seekValue && this.seekValue.length) {
        var re = new RegExp(this.seekValue, "gi");
        this.filteredChoices = new Array();
        for (let choice of this.choices) {
          if (choice[1].toLowerCase().indexOf(this.seekValue.toLowerCase()) === 0) {
            this.filteredChoices.push([choice[0], choice[1].replace(re, (str)=> "<strong>"+str+"</strong>")]);
          }
        }
        for (let choice of this.choices) {
          if (choice[1].toLowerCase().indexOf(this.seekValue.toLowerCase()) > 0) {
            this.filteredChoices.push([choice[0], choice[1].replace(re, (str)=> "<strong>"+str+"</strong>")]);
          }
        }
        if (!this.filteredChoices.length) {
          show = false;
        }
      }
      else {
        this.filteredChoices = this.choices;
      }
    }

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
  }

  onItemPicked(item) {
    this.value = item[0];
    this.showOptions(false);
    setTimeout(()=>{
      this.setFocus(false);
    })
    
    this.seekValue = null;
  }

  removeValue() {
    this.value = this.emptyValue;
    this.seekValue = '';
    this.showOptions(false);
    setTimeout(()=>{
      this.setFocus(false);
    })
  }
}
