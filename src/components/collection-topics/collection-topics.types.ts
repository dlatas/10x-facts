export interface TopicsListItemVm {
  id: string;
  name: string;
  description: string | null;
  systemKey: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionTopicsHeaderProps {
  collectionId: string;
  collectionName: string | null;
}

export interface CollectionTopicsToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onQueryCommitNow?: () => void;
  onCreateClick: () => void;
  isBusy?: boolean;
}

export interface TopicsSearchInputProps {
  value: string;
  onValueChange: (v: string) => void;
  onCommitNow?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface CreateTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export interface TopicsListStateProps {
  status: 'loading' | 'error' | 'ready';
  isEmpty: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onClearFilter?: () => void;
}

export interface TopicsListProps {
  items: TopicsListItemVm[];
  onDeleteRequest?: (item: TopicsListItemVm) => void;
  collectionNameForContext?: string | null;
}

export interface TopicRowProps {
  item: TopicsListItemVm;
  onDeleteRequest?: (item: TopicsListItemVm) => void;
  collectionNameForContext?: string | null;
}

export interface DeleteTopicConfirmDialogProps {
  open: boolean;
  topicName: string | null;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
}

