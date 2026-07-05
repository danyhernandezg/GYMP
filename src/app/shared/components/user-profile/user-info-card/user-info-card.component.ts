import { Component, Input } from '@angular/core';
import { ModalService } from '../../../services/modal.service';

import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { ModalComponent } from '../../ui/modal/modal.component';
import { AppUser } from '../../../services/users-api.service';

@Component({
  selector: 'app-user-info-card',
  imports: [
    InputFieldComponent,
    ButtonComponent,
    LabelComponent,
    ModalComponent
],
  templateUrl: './user-info-card.component.html',
  styles: ``
})
export class UserInfoCardComponent {

  constructor(public modal: ModalService) {}

  isOpen = false;
  openModal() { this.isOpen = true; }
  closeModal() { this.isOpen = false; }

  @Input() user: AppUser = {
    _id: '',
    username: '',
    firstName: 'Musharof',
    lastName: 'Chowdhury',
    role: 'alumno',
    email: 'randomuser@pimjo.com',
    phone: '+09 363 398 46',
    bio: 'Team Manager',
    location: '',
    avatar: '/images/user/owner.jpg',
    social: {
      facebook: 'https://www.facebook.com/PimjoHQ',
      x: 'https://x.com/PimjoHQ',
      linkedin: 'https://www.linkedin.com/company/pimjo',
      instagram: 'https://instagram.com/PimjoHQ',
    },
    address: {
      country: '',
      cityState: '',
      postalCode: '',
      taxId: '',
    },
    createdAt: '',
    updatedAt: '',
  };

  handleSave() {
    // Handle save logic here
    console.log('Saving changes...');
    this.modal.closeModal();
  }
}
