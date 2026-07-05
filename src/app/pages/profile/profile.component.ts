
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { UserMetaCardComponent } from '../../shared/components/user-profile/user-meta-card/user-meta-card.component';
import { UserInfoCardComponent } from '../../shared/components/user-profile/user-info-card/user-info-card.component';
import { UserAddressCardComponent } from '../../shared/components/user-profile/user-address-card/user-address-card.component';
import { AuthApiService } from '../../shared/services/auth-api.service';
import { AppUser } from '../../shared/services/users-api.service';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    FormsModule,
    PageBreadcrumbComponent,
    UserMetaCardComponent,
    UserInfoCardComponent,
    UserAddressCardComponent,
    ModalComponent
],
  templateUrl: './profile.component.html',
  styles: ``
})
export class ProfileComponent {
  user: AppUser | null = null;
  editForm: Partial<AppUser> = this.createEmptyProfileForm();
  isLoading = true;
  isSaving = false;
  isEditOpen = false;
  errorMessage = '';
  formErrorMessage = '';

  constructor(private readonly auth: AuthApiService) {}

  createEmptyProfileForm(): Partial<AppUser> {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      bio: '',
      location: '',
      avatar: '/images/user/owner.jpg',
      social: {
        facebook: '',
        x: '',
        linkedin: '',
        instagram: ''
      },
      address: {
        country: '',
        cityState: '',
        postalCode: '',
        taxId: ''
      }
    };
  }

  ngOnInit() {
    this.auth.loadCurrentUser().subscribe({
      next: (response) => {
        this.user = this.normalizeUser(response.user);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to load profile.';
        this.isLoading = false;
      }
    });
  }

  openEditModal() {
    if (!this.user) {
      return;
    }

    this.formErrorMessage = '';
    this.editForm = {
      firstName: this.user.firstName || '',
      lastName: this.user.lastName || '',
      email: this.user.email || '',
      phone: this.user.phone || '',
      bio: this.user.bio || '',
      location: this.user.location || '',
      avatar: this.user.avatar || '/images/user/owner.jpg',
      social: {
        facebook: this.user.social?.facebook || '',
        x: this.user.social?.x || '',
        linkedin: this.user.social?.linkedin || '',
        instagram: this.user.social?.instagram || ''
      },
      address: {
        country: this.user.address?.country || '',
        cityState: this.user.address?.cityState || '',
        postalCode: this.user.address?.postalCode || '',
        taxId: this.user.address?.taxId || ''
      }
    };
    this.isEditOpen = true;
  }

  closeEditModal() {
    this.isEditOpen = false;
    this.formErrorMessage = '';
  }

  saveProfile() {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    this.auth.updateCurrentUser(this.editForm).subscribe({
      next: (response) => {
        this.user = this.normalizeUser(response.user);
        this.isSaving = false;
        this.closeEditModal();
      },
      error: (error) => {
        this.formErrorMessage = error?.error?.message || 'Unable to update profile.';
        this.isSaving = false;
      }
    });
  }

  normalizeUser(user: AppUser): AppUser {
    return {
      ...user,
      avatar: user.avatar || '/images/user/owner.jpg',
      social: {
        facebook: user.social?.facebook || '',
        x: user.social?.x || '',
        linkedin: user.social?.linkedin || '',
        instagram: user.social?.instagram || ''
      },
      address: {
        country: user.address?.country || '',
        cityState: user.address?.cityState || '',
        postalCode: user.address?.postalCode || '',
        taxId: user.address?.taxId || ''
      }
    };
  }
}
