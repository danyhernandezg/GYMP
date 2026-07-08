import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AuthApiService } from '../../shared/services/auth-api.service';
import { ClassOffering, ClassesApiService } from '../../shared/services/classes-api.service';
import { AppUser, UsersApiService } from '../../shared/services/users-api.service';

@Component({
  selector: 'app-classes',
  imports: [
    CommonModule,
    FormsModule,
    PageBreadcrumbComponent,
    BadgeComponent,
    ButtonComponent,
    ModalComponent
  ],
  templateUrl: './classes.component.html',
  styles: ``
})
export class ClassesComponent implements OnInit {
  classes: ClassOffering[] = [];
  coaches: AppUser[] = [];
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 8;
  isLoading = true;
  isSaving = false;
  isDeleting = false;
  isEnrollmentSaving = false;
  isFormOpen = false;
  errorMessage = '';
  formErrorMessage = '';
  enrollmentMessage = '';
  classToDelete: ClassOffering | null = null;
  editingClass: ClassOffering | null = null;
  form = this.getEmptyForm();

  constructor(
    private readonly classesApi: ClassesApiService,
    private readonly usersApi: UsersApiService,
    private readonly auth: AuthApiService
  ) {}

  ngOnInit() {
    this.loadClasses();
    this.loadCoaches();
  }

  loadClasses() {
    this.isLoading = true;
    this.errorMessage = '';

    this.classesApi.listClasses().subscribe({
      next: (classes) => {
        this.classes = classes;
        this.currentPage = 1;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las clases.';
        this.isLoading = false;
      }
    });
  }

  loadCoaches() {
    if (!this.canManageClasses()) {
      return;
    }

    this.usersApi.listCoaches().subscribe({
      next: (coaches) => {
        this.coaches = coaches;
      }
    });
  }

  get filteredClasses() {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.classes;
    }

    return this.classes.filter((classOffering) => {
      const haystack = [
        classOffering.name,
        classOffering.type,
        classOffering.description,
        this.getDisplayName(classOffering.coach),
        classOffering.status
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }

  get totalPages() {
    return Math.max(Math.ceil(this.filteredClasses.length / this.itemsPerPage), 1);
  }

  get currentItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredClasses.slice(start, start + this.itemsPerPage);
  }

  onSearchChange() {
    this.currentPage = 1;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  openCreateModal() {
    this.editingClass = null;
    this.formErrorMessage = '';
    this.form = this.getEmptyForm();
    this.isFormOpen = true;
  }

  openEditModal(classOffering: ClassOffering) {
    this.editingClass = classOffering;
    this.formErrorMessage = '';
    this.form = {
      name: classOffering.name,
      type: classOffering.type,
      description: classOffering.description,
      coachId: classOffering.coach?._id || '',
      capacity: classOffering.capacity,
      status: classOffering.status
    };
    this.isFormOpen = true;
  }

  closeFormModal() {
    this.isFormOpen = false;
    this.editingClass = null;
    this.formErrorMessage = '';
  }

  saveClass() {
    if (this.isSaving) {
      return;
    }

    if (!this.form.name.trim() || !this.form.type.trim()) {
      this.formErrorMessage = 'Nombre y tipo son requeridos.';
      return;
    }

    if (!Number.isInteger(Number(this.form.capacity)) || Number(this.form.capacity) < 1) {
      this.formErrorMessage = 'Los cupos deben ser al menos 1.';
      return;
    }

    this.isSaving = true;
    this.formErrorMessage = '';

    const payload = {
      ...this.form,
      capacity: Number(this.form.capacity)
    };

    const request = this.editingClass
      ? this.classesApi.updateClass(this.editingClass._id, payload)
      : this.classesApi.createClass(payload);

    request.subscribe({
      next: (savedClass) => {
        if (this.editingClass) {
          this.classes = this.classes.map((classOffering) =>
            classOffering._id === savedClass._id ? savedClass : classOffering
          );
        } else {
          this.classes = [savedClass, ...this.classes];
        }

        this.isSaving = false;
        this.closeFormModal();
      },
      error: (error) => {
        this.formErrorMessage = error?.error?.message || 'No se pudo guardar la clase.';
        this.isSaving = false;
      }
    });
  }

  confirmDelete(classOffering: ClassOffering) {
    this.classToDelete = classOffering;
  }

  cancelDelete() {
    this.classToDelete = null;
  }

  deleteClass() {
    if (!this.classToDelete || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    const classId = this.classToDelete._id;

    this.classesApi.deleteClass(classId).subscribe({
      next: () => {
        this.classes = this.classes.filter((classOffering) => classOffering._id !== classId);
        this.classToDelete = null;
        this.isDeleting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo eliminar la clase.';
        this.classToDelete = null;
        this.isDeleting = false;
      }
    });
  }

  toggleEnrollment(classOffering: ClassOffering) {
    if (this.isEnrollmentSaving) {
      return;
    }

    this.isEnrollmentSaving = true;
    this.enrollmentMessage = '';

    const request = classOffering.isEnrolled
      ? this.classesApi.unenroll(classOffering._id)
      : this.classesApi.enroll(classOffering._id);

    request.subscribe({
      next: (updatedClass) => {
        this.classes = this.classes.map((item) => item._id === updatedClass._id ? updatedClass : item);
        this.enrollmentMessage = updatedClass.isEnrolled
          ? 'Inscripcion realizada correctamente.'
          : 'Inscripcion cancelada correctamente.';
        this.isEnrollmentSaving = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo actualizar la inscripcion.';
        this.isEnrollmentSaving = false;
      }
    });
  }

  canManageClasses() {
    const role = this.auth.getUser()?.role;
    return role === 'administrador' || role === 'coach';
  }

  isStudent() {
    return this.auth.getUser()?.role === 'alumno';
  }

  canEditClass(classOffering: ClassOffering) {
    const user = this.auth.getUser();
    return user?.role === 'administrador' || user?.role === 'coach';
  }

  getDisplayName(user?: AppUser) {
    if (!user) {
      return 'Sin coach';
    }

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.username || 'Sin coach';
  }

  getInitials(user?: AppUser) {
    return this.getDisplayName(user).slice(0, 2).toUpperCase();
  }

  getSpotsLabel(classOffering: ClassOffering) {
    return `${classOffering.enrolledCount}/${classOffering.capacity}`;
  }

  getAvailabilityLabel(classOffering: ClassOffering) {
    if (classOffering.status === 'archived') return 'Archivada';
    return classOffering.isFull ? 'Sin cupos' : `${classOffering.availableSpots} cupos`;
  }

  getAvailabilityBadgeColor(classOffering: ClassOffering): 'success' | 'warning' | 'error' | 'info' {
    if (classOffering.status === 'archived') return 'info';
    if (classOffering.isFull) return 'error';
    if (classOffering.availableSpots <= 2) return 'warning';
    return 'success';
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('es-SV', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(new Date(value));
  }

  private getEmptyForm() {
    return {
      name: '',
      type: '',
      description: '',
      coachId: '',
      capacity: 10,
      status: 'active' as 'active' | 'archived'
    };
  }
}
