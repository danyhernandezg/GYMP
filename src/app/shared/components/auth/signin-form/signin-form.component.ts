
import { Component } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthApiService } from '../../../services/auth-api.service';

@Component({
  selector: 'app-signin-form',
  imports: [
    LabelComponent,
    CheckboxComponent,
    ButtonComponent,
    InputFieldComponent,
    RouterModule,
    FormsModule
],
  templateUrl: './signin-form.component.html',
  styles: ``
})
export class SigninFormComponent {

  showPassword = false;
  isChecked = false;
  isSubmitting = false;
  errorMessage = '';

  username = '';
  password = '';

  constructor(
    private readonly auth: AuthApiService,
    private readonly router: Router
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSignIn() {
    if (this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.auth.login(this.username, this.password).subscribe({
      next: (response) => {
        if (response.user.role === 'alumno') {
          sessionStorage.setItem('show_student_pricing_modal', 'true');
        }

        this.router.navigate(['/calendar']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to sign in.';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}
