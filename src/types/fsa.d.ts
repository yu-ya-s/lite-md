// File System Access API のうち、TS の lib.dom にまだ含まれない部分のみを補う型定義

interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>
}

interface DirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}
