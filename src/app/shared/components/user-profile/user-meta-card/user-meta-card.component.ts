import { Component, Input } from '@angular/core';
import { InputFieldComponent } from './../../form/input/input-field.component';
import { ModalService } from '../../../services/modal.service';

import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { AppUser } from '../../../services/users-api.service';

@Component({
  selector: 'app-user-meta-card',
  imports: [
    ModalComponent,
    InputFieldComponent,
    ButtonComponent
],
  templateUrl: './user-meta-card.component.html',
  styles: ``
})
export class UserMetaCardComponent {

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
    location: 'Arizona, United States',
    avatar: '/images/user/owner.jpg',
    social: {
      facebook: 'https://www.facebook.com/PimjoHQ',
      x: 'https://x.com/PimjoHQ',
      linkedin: 'https://www.linkedin.com/company/pimjo',
      instagram: 'https://instagram.com/PimjoHQ',
    },
    email: 'randomuser@pimjo.com',
    phone: '+09 363 398 46',
    bio: 'Team Manager',
    address: {
      country: '',
      cityState: '',
      postalCode: '',
      taxId: '',
    },
    createdAt: '',
    updatedAt: '',
  };

  getDisplayName() {
    const name = `${this.user.firstName || ''} ${this.user.lastName || ''}`.trim();
    return name || this.user.username;
  }

  getInitials() {
    return this.getDisplayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'US';
  }

  handleSave() {
    // Handle save logic here
    console.log('Saving changes...');
    this.modal.closeModal();
  }
}
