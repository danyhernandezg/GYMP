import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../shared/components/form/label/label.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { AppUser, UpdateAppUser, UsersApiService } from '../../shared/services/users-api.service';
import { UserRole } from '../../shared/services/auth-api.service';

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    FormsModule,
    PageBreadcrumbComponent,
    BadgeComponent,
    ButtonComponent,
    InputFieldComponent,
    LabelComponent,
    ModalComponent
  ],
  templateUrl: './users.component.html',
  styles: ``
})
export class UsersComponent implements OnInit {
  users: AppUser[] = [];
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 5;
  isLoading = true;
  isSaving = false;
  isDeleting = false;
  isEditOpen = false;
  userToDelete: AppUser | null = null;
  editingUser: AppUser | null = null;
  editForm: UpdateAppUser = {};
  errorMessage = '';
  formErrorMessage = '';
  readonly roles: UserRole[] = ['administrador', 'coach', 'alumno'];

  constructor(private readonly usersApi: UsersApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';

    this.usersApi.listUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.currentPage = 1;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to load users.';
        this.isLoading = false;
      }
    });
  }

  get filteredUsers() {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.users;
    }

    return this.users.filter((user) =>
      user.username.toLowerCase().includes(term) || user.role.toLowerCase().includes(term)
    );
  }

  get totalPages() {
    return Math.max(Math.ceil(this.filteredUsers.length / this.itemsPerPage), 1);
  }

  get currentItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  openCreateModal() {
    this.formErrorMessage = '';
    this.editingUser = null;
    this.editForm = {
      username: '',
      password: '',
      role: 'alumno',
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
    this.isEditOpen = true;
  }

  openEditModal(user: AppUser) {
    this.formErrorMessage = '';
    this.editingUser = user;
    this.editForm = {
      username: user.username,
      role: user.role,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
      location: user.location || '',
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
    this.isEditOpen = true;
  }

  closeEditModal() {
    this.isEditOpen = false;
    this.editingUser = null;
    this.editForm = {};
    this.formErrorMessage = '';
  }

  saveUser() {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    if (this.editingUser) {
      this.updateUser();
      return;
    }

    this.createUser();
  }

  private createUser() {
    if (!this.editForm.username || !this.editForm.password || !this.editForm.role) {
      this.formErrorMessage = 'Username, password and role are required.';
      this.isSaving = false;
      return;
    }

    this.usersApi.createUser({
      username: this.editForm.username,
      password: this.editForm.password,
      role: this.editForm.role,
      firstName: this.editForm.firstName,
      lastName: this.editForm.lastName,
      email: this.editForm.email,
      phone: this.editForm.phone,
      bio: this.editForm.bio,
      location: this.editForm.location,
      avatar: this.editForm.avatar,
      social: this.editForm.social,
      address: this.editForm.address
    }).subscribe({
      next: (createdUser) => {
        this.users = [createdUser, ...this.users];
        this.closeEditModal();
        this.isSaving = false;
      },
      error: (error) => {
        this.formErrorMessage = error?.error?.message || 'Unable to create user.';
        this.isSaving = false;
      }
    });
  }

  private updateUser() {
    if (!this.editingUser) {
      return;
    }

    this.usersApi.updateUser(this.editingUser._id, this.editForm).subscribe({
      next: (updatedUser) => {
        this.users = this.users.map((user) => user._id === updatedUser._id ? updatedUser : user);
        this.closeEditModal();
        this.isSaving = false;
      },
      error: (error) => {
        this.formErrorMessage = error?.error?.message || 'Unable to update user.';
        this.isSaving = false;
      }
    });
  }

  confirmDelete(user: AppUser) {
    this.userToDelete = user;
  }

  cancelDelete() {
    this.userToDelete = null;
  }

  deleteUser() {
    if (!this.userToDelete || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    const userId = this.userToDelete._id;

    this.usersApi.deleteUser(userId).subscribe({
      next: () => {
        this.users = this.users.filter((user) => user._id !== userId);
        this.userToDelete = null;
        this.isDeleting = false;

        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to delete user.';
        this.isDeleting = false;
        this.userToDelete = null;
      }
    });
  }

  getDisplayName(user: AppUser) {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.username;
  }

  getInitials(user: AppUser) {
    return this.getDisplayName(user).slice(0, 2);
  }

  onSearchChange() {
    this.currentPage = 1;
  }

  getRoleBadgeColor(role: UserRole): 'success' | 'warning' | 'info' {
    if (role === 'administrador') return 'success';
    if (role === 'coach') return 'warning';
    return 'info';
  }

  formatRole(role: UserRole) {
    const labels: Record<UserRole, string> = {
      administrador: 'Administrador',
      coach: 'Coach',
      alumno: 'Alumno'
    };

    return labels[role];
  }
}
