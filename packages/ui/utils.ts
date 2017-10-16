import {Directive, ElementRef, Renderer, Input} from '@angular/core';

@Directive({selector: 'input-frame-content, input-frame-buttons'})
export class ModalContentDirective {
  // No behavior
  // The only purpose is to "declare" the tag in Angular2 
}

// Author https://stackoverflow.com/questions/41873893/angular2-autofocus-input-element
@Directive({
    selector: '[autofocus]'
})
export class AutofocusDirective
{
  private _autofocus;
  constructor(private el: ElementRef, private renderer: Renderer) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    if (this._autofocus || typeof this._autofocus === "undefined") {
      setTimeout(() => {
        this.el.nativeElement.focus();
        //this.renderer.invokeElementMethod(this.el.nativeElement, 'focus', []);
      })
    }
  }

  @Input() set autofocus(condition: boolean) {
      this._autofocus = condition != false;
  }
}