import {Injectable, EventEmitter, Optional,SkipSelf} from '@angular/core';
import {Observable, Subject} from 'rxjs';

var uid = 0;

@Injectable()
export class PopupDispatcher {
  uid:string;
  clickedOuside = new EventEmitter();
  popupLeaved = new EventEmitter();
  picked = new EventEmitter<any>();
  closePopup:Observable<void>|Subject<void>;
  private clickedOutsideTimerId:any;
  private popupLeavedTimerId:any;

  _downClose = new EventEmitter();
  nchildren = 0;

  opened = false;
  
  constructor(@Optional() @SkipSelf() private parentPopupDispatcher: PopupDispatcher) {
    uid++;
    this.uid = "PopupDispatcher:"+uid;
    if (!this.parentPopupDispatcher) {
      /*window.addEventListener('mousedown', () => {
        if (this.opened) {
          this.clickedOutsideTimerId = setTimeout(() => {
            this.clickedOuside.next();
          }, 4);
        }
      });*/
      this.closePopup = new Subject<void>();
    }

    if (this.parentPopupDispatcher) {
      this.clickedOuside = this.parentPopupDispatcher.clickedOuside;
      this.popupLeaved = this.parentPopupDispatcher.popupLeaved;
      this.picked = this.parentPopupDispatcher.picked;
      this.closePopup = this.parentPopupDispatcher.closePopup.merge(this._downClose);
    }
    this.closePopup = this.closePopup.filter(() => this.opened);
  }

  clickedInside() {
    if (this.parentPopupDispatcher) {
      this.parentPopupDispatcher.clickedInside();
    }
    else {
      setTimeout(() => { // Ждем вызова onWindowClick в первую очередь
        clearTimeout(this.clickedOutsideTimerId);
      });
    }
  }

  mouseEntered() {
    if (this.parentPopupDispatcher) {
      this.parentPopupDispatcher.mouseEntered();
    }
    else {
      clearTimeout(this.popupLeavedTimerId);
    }
  }

  mouseLeaved() {
    if (this.parentPopupDispatcher) {
      this.parentPopupDispatcher.mouseLeaved();
    }
    else {
      this.popupLeavedTimerId = setTimeout(() => {
        this.popupLeaved.next();
      }, 500)
    }
  }

  pick(value:any) {
    if (this.parentPopupDispatcher) {
      this.parentPopupDispatcher.pick(value);
    }
    else {
      this.picked.next(value);
    }
  }

  onWindowMouseDown = () => {
    if (this.opened) {
      this.clickedOutsideTimerId = setTimeout(() => {
        this.clickedOuside.next();
      }, 4);
    }
  }

  open() {
    this.opened = true;
    if (!this.parentPopupDispatcher) {
      window.addEventListener('mousedown', this.onWindowMouseDown);
    }
  }

  close() {
    if (this.parentPopupDispatcher) {
      this.parentPopupDispatcher.close();
    }
    else {
      (this.closePopup as Subject<void>).next();
    }
    this.opened = false;
    if (!this.parentPopupDispatcher) {
      window.removeEventListener('mousedown', this.onWindowMouseDown);
    }
  }

  // Для того, чтобы родитель мог определить есть ли потомки. (Нужно, пока не понял, как выдерать эти данные из ng-content, пока он ngIf="false")
  registerChildren() {
    this.nchildren++;
  }

  downCloseNotification() {
    this._downClose.next();
    this.opened = false;
  }
}
