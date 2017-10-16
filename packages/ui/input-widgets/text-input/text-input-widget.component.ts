import {EventEmitter, Component,Injector, ViewChild, ViewChildren, ViewContainerRef, QueryList, ElementRef, HostListener, AfterViewInit, OnDestroy, Input,OnInit, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {BaseInputWidgetComponent} from '../base-input-widget';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import {PopupDispatcher} from '../../services/popup-dispatcher';
import Inputmask from 'inputmask';
import {Subscription} from 'rxjs';
import {AstonioUIConfigService} from '../../services/config.service';

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => TextInputWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-text-input',
  templateUrl: './text-input-widget.html',
//  styleUrls: ['./text-input-widget.css'],
  providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR, PopupDispatcher],
  //inputs: ['value', 'errors', 'disabled', 'id:input_id'],
  //outputs: ['finished'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInputWidgetComponent extends BaseInputWidgetComponent implements AfterViewInit, OnInit, OnDestroy, ControlValueAccessor { 
  @Input() width:string = '100%';
  @Input() class:string = '';
  @Input() maxLength:number;
  @Input() mask:string; // Allowed symbols
  @Input() pattern:string; // inputmask pattern
  @Input() inputMaskParams:Object; // inputmask params
  @Input() inputMask:Inputmask; //inputmask object
  _replaceMask:RegExp;
  @ViewChild("inputElement") private inputElement: ElementRef;
  @ViewChildren("inputArea") private inputArea:QueryList<ElementRef>;
  inputAreaSubscription:Subscription;
  protected configService:AstonioUIConfigService;
  

  _value = '';
  private popupDispatcher:PopupDispatcher;
  private clickOutsideSubscription:Subscription;

  textareaShown = false;
  _positions = [
    {
      originX: 'start', overlayX: 'start',
      originY: 'bottom', overlayY: 'top',
    },
    {
      originX: 'end', overlayX: 'end',
      originY: 'bottom', overlayY: 'top',
    },
    {
      originX: 'start', overlayX: 'start',
      originY: 'top', overlayY: 'bottom',
    },
  ];


  constructor (protected vcr: ViewContainerRef) {
    super(vcr);
    this.popupDispatcher = this.injector.get(PopupDispatcher);
    this.clickOutsideSubscription = this.popupDispatcher.clickedOuside.subscribe(() => {
      this.showTextarea(false);
    });
    this.configService = this.injector.get(AstonioUIConfigService);
    /*setTimeout(() => {
      if (!this.componentInit)
        return;
      this.errors = ['The field is required.','Field can contain only letters and digits.'];
      //if (this.componentInit)
      //  this.cdr.detectChanges();
    }, 2000);*/
  }

  set value(val:string) {
    if (this._replaceMask) { //  && !val.match(this._mask)
      val = val.replace(this._replaceMask, '');
      this.inputElement.nativeElement.value = val;
    }
    super['value'] = val;
  }

  get value():string {
    return super['value'];
  }

  ngOnInit() {
    if (this.mask) {
      this._replaceMask = new RegExp('[^'+this.mask+']+', "g");
    }

    if (this.inputMaskParams) {
      this.inputMask = new Inputmask(this.inputMaskParams);
    }
    else if (this.pattern) {
      this.inputMask = new Inputmask(this.pattern);
    }

    if (!this.disabled && this.startWithChar && this.startWithChar.length) {
      this.value = this.startWithChar;
    }
  }
    
  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (!this.disabled) {
      if (this.startWithChar) {
        this.setFocus(false);
      }
      else if (this.startWithKey || this.focusAfterInit) {
        this.setFocus(true);
      }
    }

    if (this.inputMask && !this.disabled) {
      this.inputMask.mask(this.inputElement.nativeElement);
    }

    // При появлении расширенного поля ввода, к нему так же применяем форматер ввода inputmask
    this.inputAreaSubscription = this.inputArea.changes.subscribe(ql => {
      if (!ql.length || !this.inputMask)
        return;
      this.inputMask.mask(ql.first.nativeElement);
    })
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.clickOutsideSubscription.unsubscribe();
    if (this.inputAreaSubscription)
      this.inputAreaSubscription.unsubscribe();
  }
  
  onKeyDown($event) {
    let keyCode = $event.which || $event.keyCode;
    if (keyCode === 9 || keyCode === 13 || keyCode === 38 || keyCode === 40 ) {
      setTimeout(() => {
        if (!this.componentInit)
          return;
        this.showTextarea(false);
        this.finished.next($event);
      });
      
      //this.finished.compl ete();
    }
    if (keyCode === 37 || keyCode === 39) {
      $event.stopPropagation();
    }
  }
  
  showTextarea(show:boolean) {
    if (show) {
      this.popupDispatcher.open()
    }
    else {
      this.popupDispatcher.close();
    }
    
    this.cdr.detectChanges();
  }

  onTextareaKeyDown(event:KeyboardEvent) {
    if (event.keyCode == 27 && this.popupDispatcher.opened) {
      this.showTextarea(false);
      this.setFocus();
    }
    else if (event.keyCode == 13 && !event.shiftKey) {
      this.showTextarea(false);
      this.setFocus();
      this.finished.next(event);
    }
    else {
      this.cdr.markForCheck();
    }
  }

  setFocus(select=false) {
    //setTimeout(() => {
    if (!this.componentInit || this.disabled)
      return;

    this.inputElement.nativeElement.focus();
    if (select) {
      setTimeout(() => {
        this.inputElement.nativeElement.select();
      })
      
    }
    //input.setSelectionRange(0, (""+this.value).length ); // Конвертируем в строку, т.к. значение может быть и число и объект
    //});
  }
}


