import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Announcement } from '@/hooks/useAnnouncements';
import * as LucideIcons from 'lucide-react';

const getIconComponent = (iconName: string) => {
  const pascalCase = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const IconComponent = (LucideIcons as any)[pascalCase];
  return IconComponent || LucideIcons.Sparkles;
};

interface Props {
  announcement: Announcement;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
  onToggleActive: (announcement: Announcement) => void;
}

const SortableAnnouncementRow: React.FC<Props> = ({
  announcement,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: announcement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getIconComponent(announcement.icon);

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          <span>{announcement.display_order}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <IconComponent className="w-4 h-4 text-gray-600" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{announcement.text_ar}</TableCell>
      <TableCell className="text-gray-500">{announcement.text}</TableCell>
      <TableCell className="text-center">
        <button
          onClick={() => onToggleActive(announcement)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            announcement.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {announcement.is_active ? (
            <>
              <Eye className="w-3 h-3" />
              نشط
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" />
              مخفي
            </>
          )}
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(announcement)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(announcement)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SortableAnnouncementRow;
