import {Injectable, Component, Input, Output, EventEmitter, ViewContainerRef, ComponentRef, Type} from '@angular/core';
import {WindowsManager} from '../windows/windows-manager.service';
import {Observable} from 'rxjs';
import {Window} from '../windows/window';

export interface Choise<V>{
  text:string, 
  value:V, 
  default?:boolean
}

export interface DialogButton {
  value:any, 
  caption:string
} 

export enum QuestionDialogMode {
  YesNo,
  YesNoCancel,
  OK,
  OKCancel,
  RetryCancel,
  AbortRetryIgnore
}

export enum QuestionDialogReturnCode {
  Cancel,
  No,
  Yes,
  OK,
  Retry,
  Abort,
  Ignore
}

@Component({
  template: `<div fxLayout="column" class="ast-window-content">
               <div fxFlex="auto" class="ast-question-dialog-text">
                 {{ text }}
               </div>
               <div fxFlex="nogrow">
                 <ast-toolbar align="right" class="ast-bottom-window-toolbar">
                   <ast-button *ngFor="let btn of buttons" [text]="btn.caption" [default]="btn.value==defaultButton"  (click)="doAnswer(btn.value)"></ast-button>
                 </ast-toolbar>
               </div>
             </div>
             `,
})
export class QuestionDialogComponent {
  @Input() buttons:DialogButton[];
  @Input() text:string;
  @Input() defaultButton:QuestionDialogReturnCode|any;
  @Output() answer:EventEmitter<QuestionDialogReturnCode> = new EventEmitter();

  doAnswer(answer) {
    this.answer.next(answer);
    this.answer.complete();
  }
}

@Component({
  template: `<div fxLayout="column" class="ast-window-content">
               <div fxFlex="auto" *ngIf="text && text.length" class="ast-choise-dialog-text">
                 {{ text }}
               </div>
               <ast-items-list  fxFlex="grow" [items]="choices" [ifProcessKeys]="true" (picked)="doChoice($event)" #itemsList class="ast-choise-dialog-items-list">
                 <ng-template let-item="item">
                   {{item.text}}
                 </ng-template>
               </ast-items-list>
               <div fxFlex="nogrow">
                 <ast-toolbar align="right" class="ast-bottom-window-toolbar">
                   <ast-button text="Close" [default]="true" (click)="doClose()"></ast-button>
                 </ast-toolbar>
               </div>
             </div>
             `,
})
export class ChoiceDialogComponent {
  @Input() text:string;
  @Input() choices:Choise<any>[];
  @Output() choice:EventEmitter<any> = new EventEmitter();

  constructor(private wnd:Window<ChoiceDialogComponent, any>) {

  }

  doChoice(choice:Choise<any>) {
    this.choice.next(choice.value);
    this.choice.complete();
  }
  
  doClose() {
    this.wnd.close().subscribe(res => {
      this.choice.complete();
    });
    
  }
}

@Injectable()
export class DialogService {
  constructor(private bwm:WindowsManager) {

  }  

  question<PC, PPC>(parentWnd: Window<PC, PPC>, text:string, buttons:DialogButton[]|QuestionDialogMode, defaultButton: QuestionDialogReturnCode|any, title:string=null, size:"sm" | "md" | "lg"='md'):Observable<QuestionDialogReturnCode> {
    var dialogButtons:DialogButton[] = [];
    if (typeof buttons == 'object') {
      dialogButtons = buttons as DialogButton[];
    }
    else {
      if (buttons == QuestionDialogMode.YesNo) {
        dialogButtons = [{value: QuestionDialogReturnCode.Yes, caption: 'Yes'},
                         {value: QuestionDialogReturnCode.No, caption: 'No'}];
      }
      else if (buttons == QuestionDialogMode.YesNoCancel) {
        dialogButtons = [{value: QuestionDialogReturnCode.Yes, caption: 'Yes'},
                         {value: QuestionDialogReturnCode.No, caption: 'No'}, 
                         {value: QuestionDialogReturnCode.Cancel, caption: 'Cancel'}];  
      }
      else if (buttons == QuestionDialogMode.OK) {
        dialogButtons = [{value: QuestionDialogReturnCode.OK, caption: 'OK'}];  
      }
      else if (buttons == QuestionDialogMode.OKCancel) {
        dialogButtons = [{value: QuestionDialogReturnCode.OK, caption: 'OK'},
                         {value: QuestionDialogReturnCode.Cancel, caption: 'Cancel'}];  
      }
      else if (buttons == QuestionDialogMode.RetryCancel) {
        dialogButtons = [{value: QuestionDialogReturnCode.Retry, caption: 'Retry'},
                         {value: QuestionDialogReturnCode.Cancel, caption: 'Cancel'}];  
      }
      else if (buttons == QuestionDialogMode.AbortRetryIgnore) {
        dialogButtons = [{value: QuestionDialogReturnCode.Abort, caption: 'Abort'},
                         {value: QuestionDialogReturnCode.Retry, caption: 'Retry'},
                         {value: QuestionDialogReturnCode.Ignore, caption: 'Ignore'}];  
      }
    }

    if (!title)
      title = 'Question';
    
    return Observable.create(observer => {
      var wnd:Window<QuestionDialogComponent, PC> = new Window(this.bwm, parentWnd, {
        component: QuestionDialogComponent,  
        name: 'ast-question-dialog', 
        dialog: size,
        isModal: true,
        title: title,
        componentParams: {buttons: dialogButtons, text:text, defaultButton: defaultButton}});

      wnd.componentRef.instance.answer.subscribe(answer => {
        wnd.close().subscribe(res => {
          observer.next(answer);
          observer.complete();
        });
        
      });
    })
    
  }

  choice<V, PC, PPC>(parentWnd: Window<PC, PPC>, choices:Choise<V>[], text:string='', title:string=null, size:"sm" | "md" | "lg"='md'):Observable<V> {
    if (!title)
      title = 'Select';
    
    return Observable.create(observer => {
      var wnd:Window<ChoiceDialogComponent, PC> = new Window(this.bwm, parentWnd, {
        component: ChoiceDialogComponent,
        name: 'ast-choise-dialog', 
        dialog: size,
        isModal: true,
        title: title,
        componentParams: {choices: choices, text:text}});

      wnd.componentRef.instance.choice.subscribe(answer => {
        wnd.close().subscribe(res => {
          observer.next(answer);
          observer.complete();
        });
      });
    })
    
  }
}