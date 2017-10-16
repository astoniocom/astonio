import {EventEmitter, Component,Injector, HostListener, ViewContainerRef, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, Input, Output, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy} from '@angular/core';
import {BaseInputWidgetComponent} from '../base-input-widget';
import {NG_VALUE_ACCESSOR, ControlValueAccessor} from '@angular/forms';
import {PopupDispatcher} from '../../services/popup-dispatcher';
import Inputmask from 'inputmask';
import mathjs from 'mathjs';
import {Subscription} from 'rxjs';
import {AstonioUIConfigService} from '../../services/config.service';

//TODO подумать, как сделать ограничение числа символов: maxLength или целая/дробная

const CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => NumberInputWidgetComponent),
  multi: true
};

@Component({
  selector: 'ast-number-input',
  templateUrl: './number-input-widget.html',
  //styleUrls: ['./number-input-widget.css'],
  providers: [CUSTOM_INPUT_CONTROL_VALUE_ACCESSOR, PopupDispatcher],
  inputs: ['value', 'errors', 'disabled', 'id:input_id'],
  outputs: ['finished'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberInputWidgetComponent extends BaseInputWidgetComponent implements OnInit, AfterViewInit, OnDestroy { 
  @Input() width:string = '100%';
  @Input() class:string = '';
  @Input() inputMask:Inputmask; //inputmask object
  @Input() inputMaskParams:Object; // inputmask params
  @Input() groupSeparator: string = ' ';
  @Input() autoGroup: boolean = true;
  @Input() fractionalDigits:number;
  @Input() placeholder:string;
  @Input() prefix:string;
  @Input() suffix:string;
  @Input() allowMinus:boolean = true;
  @Input() min:number;
  @Input() max:number;
  @ViewChild("inputElement") private inputElement: ElementRef;
  expression:string;

  _inputValue:string = '';
  set inputValue(value:string) {
    if (value == this._inputValue)
      return

    this._inputValue = value;
    if (value == '')
      var resValue:number = null;
    else {
      var resValue = this.inputElement.nativeElement.inputmask.unmaskedvalue() as number;
    }
    //else if (this.inputElement && this.inputElement.nativeElement.inputmask) { // не disabled
      //this.inputElement.nativeElement.value = this._inputValue;
      
      //var resValue = this.inputMask.unmaskedvalue(this._inputValue);
    //}
    //else
    //  var resValue = parseFloat(this._inputValue.replace(/[\s']/, "")); // Disavbled TODO тут надо бы избежать этого. дожидаться, 
                                                                        // пока заработает inputmask и уже дальше парсить строку Inputmask-ом
                                                                        // Иначе, если распарсится значение неправильно, то произойдет его 
                                                                        // изменение при инициализации контрола и это изменит запись-владельца
                                                                        //

    this.assignValue(resValue, 'input');

    if (this.componentInit)
      this.cdr.detectChanges(); /// Изза этого может возникать ошибка
  }

  assignValue(val:number, source:'system'|'input') {
    if (val == this._value)
      return;

    if (this.componentInit && source == 'system')
      this._inputValue = val == null ? '' : ''+val;  //this.inputMask.format(''+val)
    super.value = val;
  }

  get inputValue():string {
    return this._inputValue;
  }

  set value(val:number) {
    this.assignValue(val, 'system');
  }
  
  get value():number {
    return super.value;
  }

  _positions = [
    {
      originX: 'end', overlayX: 'end',
      originY: 'bottom', overlayY: 'top',
    },
    {
      originX: 'start', overlayX: 'start',
      originY: 'bottom', overlayY: 'top',
    },
    {
      originX: 'end', overlayX: 'end',
      originY: 'top', overlayY: 'bottom',
    },
  ];

  private popupDispatcher:PopupDispatcher;
  private clickOutsideSubscription:Subscription;
  protected configService:AstonioUIConfigService;

  constructor (protected vcr: ViewContainerRef) {
    super(vcr);
    this.popupDispatcher = this.injector.get(PopupDispatcher);
    this.clickOutsideSubscription = this.popupDispatcher.clickedOuside.subscribe(() => {
      this.showCalculator(false);
    });
    this.configService = this.injector.get(AstonioUIConfigService);
    /*setTimeout(() => {
      this.errors = ['wrwerwer','234234rew', 'wer23erw'];
    }, 3000);*/
  }

  ngOnInit() {
    if (!this.inputMask) {
      if (!this.inputMaskParams) {
        this.inputMaskParams = {
          alias: "numeric",
          groupSeparator: this.groupSeparator,
          autoGroup: this.autoGroup,
          digits: this.fractionalDigits,
          placeholder: this.placeholder,
          prefix: this.prefix,
          suffix: this.suffix,
          radixPoint: ",",
          allowMinus: this.allowMinus,
          min: this.min,
          max: this.max,
          unmaskAsNumber: true,
          onBeforeWrite: function (event, buffer, caretPos, opts) {
            if (!buffer) // To allow radixPoint both comma ang dot
              return;
            buffer.forEach((ch, idx)  => {
              if (ch == ',')
                buffer[idx] = '.';
            });
          }
        };
      }
    
      this.inputMask = new Inputmask(this.inputMaskParams);
      
    }

    if (!this.disabled && this.startWithChar && this.startWithChar.length) {
      this.value = parseInt(this.startWithChar);
    }
    this._inputValue = this.value == null ? '' : ''+this.value;  
    //this.inputValue = this.value == null ? '' : this.inputMask.format(''+this.value);  
    
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    
    //this._inputValue = this.inputMask.format(this.inputValue); // very slow with this
    
    if (!this.disabled) {
      this.inputMask.mask(this.inputElement.nativeElement);

      if (this.startWithChar) {
        this.setFocus(false);
      }
      else if (this.startWithKey || this.focusAfterInit) {
        this.setFocus(true);
      }
    }
  }

  ngOnDestroy() {
    this.clickOutsideSubscription.unsubscribe();

    super.ngOnDestroy();
  }

  onContainerKeyDown(event:KeyboardEvent):boolean|void {
    var keyCode = event.keyCode;

    if (this.inputElement && this.inputElement.nativeElement == document.activeElement && [37, 39].indexOf(keyCode) !== -1) {
      return false;
    }
  }

  getViewValue() {
    //return this.inputMask.format(''+this.value);  
    return this.inputValue;
  }

  onKeyDown($event) {
    let keyCode = $event.which || $event.keyCode;

    if ('/*+%()'.indexOf($event.key) !== -1/* && $event.target.selectionEnd !== 0*/) {
      this.expression = ''+(this.value==null?'':this.value)+$event.key;
      this.showCalculator(true);
    }
  }

  onCalculatorKeyDown(event:KeyboardEvent) {
    if (event.keyCode == 27 && this.popupDispatcher.opened) {
      this.showCalculator(false);
      this.setFocus();
    }

    if (event.keyCode == 13 && !event.shiftKey) {
      this.showCalculator(false);
      try {
        var res = mathjs.eval(this.expression);
        if (res) {
          this.value = res;
          this.cdr.detectChanges();
        }
      }
      catch (e) {

      }
      this.setFocus();
    }
  }

  setFocus(select=false) {
    if (!this.componentInit || this.disabled)
      return;

    this.inputElement.nativeElement.focus();
    if (select) {
      setTimeout(() => {
        this.inputElement.nativeElement.select();  
        //this.inputElement.nativeElement.setSelectionRange(0, (""+this.value).length );
      });
    }
  }

  showCalculator(show:boolean) {
    if (show) {
      this.popupDispatcher.open()
    }
    else {
      this.popupDispatcher.close();
    }

    this.cdr.detectChanges();
  }

  isFocused():boolean {
    if (this.disabled)
      return false;

    if (this.inputElement && this.inputElement.nativeElement == document.activeElement)
      return true;

    return false;
  }
}


