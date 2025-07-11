import NewContainer from '@/components/NewContainer';
import AiGenerate from '@/components/aiGenerate';
import ArchiveSearch from '@/components/archiveSearch';
import AttachmentSelect from '@/components/attachment';
import CollapseItem from '@/components/collaspeItem';
import WangEditor from '@/components/editor';
import Keywords from '@/components/keywords';
import MarkdownEditor from '@/components/markdown';
import {
  anqiExtractDescription,
  anqiExtractKeywords,
  deleteArchiveImage,
  getArchiveInfo,
  getArchives,
  getCategories,
  getCategoryInfo,
  getDesignTemplateFiles,
  getModules,
  getSettingContent,
  pluginGetUserGroups,
  pluginGetUserInfo,
  pluginGetUsers,
  saveArchive,
} from '@/services';
import { getTags } from '@/services/tag';
import { getStore, removeStore, setStore } from '@/utils/store';
import {
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  ProForm,
  ProFormCheckbox,
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormInstance,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { FormattedMessage, history, injectIntl } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Image,
  Modal,
  Row,
  Space,
  Tag,
  message,
} from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import { IntlShape } from 'react-intl';
import './index.less';

export type intlProps = {
  intl: IntlShape;
};

class ArchiveForm extends React.Component<intlProps> {
  state: { [key: string]: any } = {
    fetched: false,
    archive: { extra: {}, content: '', flag: [] },
    relations: [],
    extraContent: {},
    extraTexts: {},
    content: '',
    modules: [],
    module: { fields: [] },
    contentSetting: {},

    archiveSearchVisible: false,
    keywordsVisible: false,
    searchedTags: [],
    searchArchives: [
      {
        id: 0,
        title: this.props.intl.formatMessage({
          id: 'content.parent_id.empty',
        }),
      },
    ],
    selectedArchives: [],
    searchUsers: [
      {
        id: 0,
        title: this.props.intl.formatMessage({
          id: 'content.parent_id.empty',
        }),
      },
    ],
    selectedUser: {},

    aiVisible: false,
    aiTitle: '',
    newKey: '',
  };

  submitted = false;
  defaultContent = '';

  formRef = React.createRef<ProFormInstance>();

  editorRef = React.createRef<any>();

  initArchive = async () => {
    try {
      const setting = await getSettingContent();
      this.setState({
        contentSetting: setting.data || {},
      });
    } catch (err) {
      message.error(
        this.props.intl.formatMessage({ id: 'content.networt.error' }),
      );
      return;
    }
    const res = await getModules();
    this.setState(
      {
        modules: res.data || [],
      },
      () => {
        const searchParams = new URLSearchParams(window.location.search);
        const moduleId = searchParams.get('module_id') || 1;
        let categoryId = Number(searchParams.get('category_id') || 0);
        const copyId = Number(searchParams.get('copyid') || 0);
        const lastCategoryId = getStore('last_category_id') || 0;
        if (categoryId === 0 && lastCategoryId > 0) {
          categoryId = lastCategoryId;
        }
        let id: any = searchParams.get('id') || 0;
        if (id === 'new') {
          id = 0;
        }
        if (id > 0) {
          this.getArchive(Number(id));
        } else {
          if (copyId > 0) {
            this.getArchive(Number(copyId), true);
          } else {
            const archive = getStore('unsaveArchive');
            if (archive) {
              console.log('load store');
              categoryId = archive.category_id;
              if (archive.category_ids?.length > 0) {
                categoryId = archive.category_ids[0];
              }
              let arcIds = [];
              if (archive.parent_id > 0) {
                arcIds.push(archive.parent_id);
              }
              this.getSelectedArchives(arcIds);
              this.setState({
                archive,
              });
            } else {
              this.setState({
                archive: {
                  extra: {},
                  content: '',
                  flag: [],
                  category_ids: [categoryId],
                },
              });
            }
            this.defaultContent = archive?.content || '';
            this.setState({
              fetched: true,
              content: archive?.content || '',
            });
          }
        }

        if (categoryId > 0) {
          this.getArchiveCategory(Number(categoryId));
        } else {
          // 先默认是文章
          this.getModule(Number(moduleId));
        }
      },
    );
  };

  componentDidMount = async () => {
    this.initArchive();

    window.addEventListener('beforeunload', this.beforeunload);
  };

  onTabChange = (key: string) => {
    this.setState({
      fetched: false,
    });
    this.initArchive().then(() => {
      this.setState({
        newKey: key,
      });
    });
  };

  beforeunload = (e: any) => {
    let archive = this.state.archive;
    if (!archive.id && !this.submitted) {
      console.log('save-store');
      const values = this.formRef.current?.getFieldsFormatValue?.();
      archive.content = this.state.content;
      archive = Object.assign(archive, values);
      if (typeof archive.flag === 'object') {
        archive.flag = archive.flag.join(',');
      }
      setStore('unsaveArchive', archive);
    }
    if (
      this.state.content !== '' &&
      this.state.content !== this.defaultContent
    ) {
      const confirmationMessage = this.props.intl.formatMessage({
        id: 'content.confirm-giveup',
      });
      (e || window.event).returnValue = confirmationMessage;
      return confirmationMessage;
    }

    return null;
  };

  componentWillUnmount() {
    let archive = this.state.archive;
    if (!archive.id && !this.submitted) {
      console.log('save-store');
      const values = this.formRef.current?.getFieldsFormatValue?.();
      archive.content = this.state.content;
      archive = Object.assign(archive, values);
      if (typeof archive.flag === 'object') {
        archive.flag = archive.flag.join(',');
      }
      setStore('unsaveArchive', archive);
    }
    window.removeEventListener('beforeunload', this.beforeunload);
  }

  getArchive = async (id: number, copy?: boolean) => {
    const res = await getArchiveInfo({
      id: id,
    });
    const archive = res.data || { extra: {}, flag: null };
    if (copy) {
      archive.id = 0;
      archive.parent_id = 0;
      archive.url_token = '';
      archive.created_time = 0;
      archive.updated_time = 0;
    }
    if (typeof archive.extra === 'undefined' || archive.extra === null) {
      archive.extra = {};
    }
    let content = archive.data?.content || '';
    archive.flag = archive.flag?.split(',') || [];
    archive.created_moment = dayjs(archive.created_time * 1000);
    this.defaultContent = content;
    const module = await this.getModule(archive.module_id);
    let extraContent: any = {};
    for (let i in module.fields) {
      if (module.fields[i].type === 'editor') {
        extraContent[module.fields[i].field_name] =
          archive.extra[module.fields[i].field_name]?.value || '';
      }
    }
    let arcIds = [];
    if (archive.parent_id > 0) {
      arcIds.push(archive.parent_id);
    }
    let extraTexts: any = {};
    for (let i in module.fields) {
      if (module.fields[i].type === 'texts') {
        extraTexts[module.fields[i].field_name] =
          archive.extra[module.fields[i].field_name]?.value || [];
      } else if (
        module.fields[i].type === 'archive' &&
        archive.extra[module.fields[i].field_name]?.value?.length > 0
      ) {
        arcIds.push(...archive.extra[module.fields[i].field_name]?.value);
      }
    }
    if (archive.user_id > 0) {
      pluginGetUserInfo({
        id: archive.user_id,
      }).then((res) => {
        if (res.data) {
          this.setState({
            selectedUser: res.data,
            searchUsers: [res.data],
          });
        }
      });
    }
    this.getSelectedArchives(arcIds);
    this.getArchiveCategory(archive.category_id);
    this.setState({
      fetched: true,
      archive: archive,
      content: content,
      extraContent: extraContent,
      extraTexts: extraTexts,
      relations: archive.relations || [],
    });
  };

  getSelectedArchives = (arcIds: number[]) => {
    if (arcIds.length > 0) {
      // 存在了再处理
      getArchives({
        id: arcIds.join(','),
        limit: 20,
      }).then((res) => {
        if (res.data) {
          this.setState({
            selectedArchives: res.data,
            searchArchives: res.data,
          });
        }
      });
    }
  };

  getArchiveCategory = async (categoryId: number) => {
    const res = await getCategoryInfo({
      id: categoryId,
    });
    const category = res.data || {};
    if (category.module_id) {
      this.getModule(category.module_id);
    }
  };

  onChangeSelectCategory = (e: any) => {
    let categoryId = 0;
    if (typeof e === 'number') {
      // 单分类
      categoryId = Number(e);
    } else {
      for (let i in e) {
        if (e[i] > 0) {
          categoryId = e[i];
          break;
        }
      }
    }
    setStore('last_category_id', categoryId);
    this.getArchiveCategory(categoryId);
  };

  getModule = async (moduleId: number) => {
    if (this.state.module.id === moduleId) {
      return this.state.module;
    }
    let module = { fields: [] };
    for (const item of this.state.modules) {
      if (item.id === moduleId) {
        module = item;
        break;
      }
    }
    this.setState({
      module: module,
    });
    return module;
  };

  setContent = async (html: string) => {
    this.setState({
      content: html,
    });
  };

  setExtraContent = async (field: string, html: string) => {
    const { extraContent } = this.state;
    extraContent[field] = html;
    this.setState({
      extraContent,
    });
  };

  handleSelectImages = (rows: any) => {
    const { archive } = this.state;
    if (!archive.images) {
      archive.images = [];
    }
    for (const row of rows) {
      let exists = false;
      for (const i in archive.images) {
        if (archive.images[i] === row.logo) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        archive.images.push(row.logo);
      }
    }
    this.setState({
      archive,
    });
    message.success(
      this.props.intl.formatMessage({ id: 'setting.system.upload-success' }),
    );
  };

  handleCleanLogo = (index: number, e: any) => {
    e.stopPropagation();
    const { archive } = this.state;
    // 请求接口删除
    deleteArchiveImage({ id: archive.id, image_index: index })
      .then(() => {
        archive.logo = '';
        archive.images.splice(index, 1);
        this.setState({
          archive,
        });
      })
      .catch(() => {});
  };

  handleExtractDescription = () => {
    if (this.state.content.length < 100) {
      message.error(
        this.props.intl.formatMessage({
          id: 'content.archive.content.length.error',
        }),
      );
      return false;
    }
    Modal.confirm({
      title: this.props.intl.formatMessage({
        id: 'content.archive.extract.description',
      }),
      content: this.props.intl.formatMessage({
        id: 'content.archive.extract.description.content',
      }),
      onOk: () => {
        anqiExtractDescription({
          text: this.state.content,
        })
          .then((res) => {
            if (res.code === 0) {
              this.formRef?.current?.setFieldsValue({
                description: res.data,
              });
            } else {
              message.info(res.msg);
            }
          })
          .catch((err) => {
            message.error(
              err.msg ||
                this.props.intl.formatMessage({
                  id: 'content.submit.failure',
                }),
            );
          });
      },
    });
  };

  handleExtractKeywords = () => {
    if (this.state.content.length < 100) {
      message.error(
        this.props.intl.formatMessage({
          id: 'content.archive.content.length.error',
        }),
      );
      return false;
    }
    Modal.confirm({
      title: this.props.intl.formatMessage({
        id: 'content.archive.extract.keywords',
      }),
      content: this.props.intl.formatMessage({
        id: 'content.archive.extract.keywords.content',
      }),
      onOk: () => {
        anqiExtractKeywords({
          text: this.state.content,
        })
          .then((res) => {
            if (res.code === 0) {
              this.formRef?.current?.setFieldsValue({
                keywords: res.data?.join(','),
              });
            } else {
              message.info(res.msg);
            }
          })
          .catch((err) => {
            message.error(
              err.msg ||
                this.props.intl.formatMessage({
                  id: 'content.submit.failure',
                }),
            );
          });
      },
    });
  };

  handleChooseKeywords = () => {
    this.setState({
      keywordsVisible: true,
    });
  };

  handleHideKeywords = () => {
    this.setState({
      keywordsVisible: false,
    });
  };

  handleShowArchiveSearchs = () => {
    this.setState({
      archiveSearchVisible: true,
    });
  };

  handleHideArchiveSearchs = () => {
    this.setState({
      archiveSearchVisible: false,
    });
  };

  handleSelectedArchives = async (values: any[]) => {
    const { relations } = this.state;
    for (let i in values) {
      if (!values.hasOwnProperty(i)) continue;
      let exist = false;
      for (let j in relations) {
        if (!relations.hasOwnProperty(j)) continue;
        if (relations[j].id === values[i].id) {
          exist = true;
          break;
        }
      }
      if (!exist) {
        relations.push(values[i]);
      }
    }
    this.setState({
      relations,
    });
    this.handleHideArchiveSearchs();
  };

  handleRemoveRelation = (index: number) => {
    const { relations } = this.state;
    relations.splice(index, 1);
    this.setState({
      relations,
    });
  };

  handleSelectedKeywords = async (values: string[]) => {
    const keywords = (
      this.formRef?.current?.getFieldValue('keywords') || ''
    ).split(',');
    for (const item of values) {
      if (keywords.indexOf(item) === -1) {
        keywords.push(item);
      }
    }
    this.formRef?.current?.setFieldsValue({
      keywords: keywords.join(',').replace(/^,+/, '').replace(/,+$/, ''),
    });
    this.handleHideKeywords();
  };

  onChangeTagInput = (e: any) => {
    const value = e.target?.value || '';
    getTags({
      type: 1,
      title: value,
      pageSize: 10,
    }).then((res) => {
      const data = res.data || [];
      const result: any = {};
      for (const item of data) {
        result[item.title] = item.title;
      }
      this.setState({
        searchedTags: result,
      });
    });
  };

  onSubmit = async (values: any) => {
    const { archive, content, extraContent, extraTexts, relations } =
      this.state;
    const postData = Object.assign(archive, values);
    postData.relation_ids = relations.map((item: any) => item.id);
    delete postData.relations;
    postData.price = Number(values.price);
    postData.stock = Number(values.stock);
    // eslint-disable-next-line guard-for-in
    for (let field in extraContent) {
      if (!postData.extra[field]) {
        postData.extra[field] = {};
      }
      postData.extra[field].value = extraContent[field];
    }
    // eslint-disable-next-line guard-for-in
    for (let field in extraTexts) {
      if (!postData.extra[field]) {
        postData.extra[field] = {};
      }
      postData.extra[field].value = extraTexts[field]
        .map((item: any) => {
          return {
            key: item.key || '',
            value: item.value || '',
          };
        })
        .filter((item: any) => item.key);
    }
    // 必须选择分类
    let categoryIds = [];
    let categoryId = 0;
    if (typeof values.category_ids === 'number') {
      // 单分类
      categoryId = Number(values.category_ids);
    } else {
      for (let i in values.category_ids) {
        if (values.category_ids[i] > 0) {
          categoryIds.push(values.category_ids[i]);
        }
      }
      if (categoryIds.length > 0) {
        categoryId = categoryIds[0];
      }
    }
    if (categoryId === 0) {
      message.error(
        this.props.intl.formatMessage({ id: 'content.category.required' }),
      );
      return;
    }
    postData.category_id = categoryId;
    postData.category_ids = categoryIds;
    const hide = message.loading(
      this.props.intl.formatMessage({ id: 'setting.system.submitting' }),
      0,
    );
    postData.content = content;
    if (typeof postData.flag === 'object') {
      postData.flag = postData.flag.join(',');
    }
    const res = await saveArchive(postData);
    hide();
    if (res.code !== 0) {
      if (res.data && res.data.id) {
        // 提示
        Modal.confirm({
          title: res.msg,
          content: this.props.intl.formatMessage({
            id: 'content.submit.confirm',
          }),
          cancelText: this.props.intl.formatMessage({
            id: 'content.submit.cancel',
          }),
          okText: this.props.intl.formatMessage({
            id: 'content.submit.ok-force',
          }),
          onOk: () => {
            values.force_save = true;
            this.onSubmit(values);
          },
        });
        return;
      }
      message.error(res.msg);
    } else {
      // 设置最近更新过的文档
      setStore('latest_update', {
        id: res.data.id,
        timestamp: new Date().getTime() / 1000,
      });
      removeStore('unsaveArchive');
      this.submitted = true;
      message.success(res.msg);
      history.back();
    }
  };

  handleCleanExtraField = (field: string) => {
    const extra: any = {};
    extra[field] = { value: '' };
    this.formRef?.current?.setFieldsValue({ extra });

    const { archive } = this.state;
    delete archive.extra[field];
    this.setState({
      archive,
    });
  };

  handleUploadExtraField = (field: string, row: any) => {
    const extra: any = {};
    extra[field] = { value: row.logo };
    this.formRef?.current?.setFieldsValue({ extra });
    const { archive } = this.state;
    if (!archive.extra[field]) {
      archive.extra[field] = {};
    }
    archive.extra[field].value = row.logo;

    this.setState({
      archive,
    });
  };

  handleCleanExtraFieldItem = (field: string, index: number) => {
    const { archive } = this.state;
    archive.extra[field].value?.splice(index, 1);
    const extra: any = {};
    extra[field] = { value: archive.extra[field].value };
    this.formRef?.current?.setFieldsValue({ extra });

    this.setState({
      archive,
    });
  };

  handleMoveExtraFieldItem = (
    field: string,
    index: number,
    direction: 'up' | 'down',
  ) => {
    const { archive } = this.state;
    if (direction === 'up') {
      if (index <= 0) {
        return;
      }
      const temp = archive.extra[field].value[index];
      archive.extra[field].value[index] = archive.extra[field].value[index - 1];
      archive.extra[field].value[index - 1] = temp;
    } else {
      if (index >= archive.extra[field].value.length - 1) {
        return;
      }
      const temp = archive.extra[field].value[index];
      archive.extra[field].value[index] = archive.extra[field].value[index + 1];
      archive.extra[field].value[index + 1] = temp;
    }
    this.setState({
      archive,
    });
  };

  handleUploadExtraFieldItem = (field: string, rows: any) => {
    const { archive } = this.state;
    if (!archive.extra[field]) {
      archive.extra[field] = {
        value: [],
      };
    }
    if (!archive.extra[field].value?.length) {
      archive.extra[field].value = [];
    }
    for (const row of rows) {
      let exists = false;
      for (const i in archive.extra[field].value) {
        if (archive.extra[field].value[i] === row.logo) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        archive.extra[field].value.push(row.logo);
      }
    }
    const extra: any = {};
    extra[field] = { value: archive.extra[field].value };
    this.formRef?.current?.setFieldsValue({ extra });

    this.setState({
      archive,
    });
  };

  onAddExtraTextsField = (field: string) => {
    const { extraTexts } = this.state;
    if (!extraTexts[field]) {
      extraTexts[field] = [];
    }
    extraTexts[field].push({
      key: '',
      value: '',
    });
    const extra: any = {};
    extra[field] = { value: extraTexts[field] };
    this.formRef?.current?.setFieldsValue({ extra });
    this.setState({
      extraTexts,
    });
  };

  onChangeExtraTextsField = (
    field: string,
    idx: number,
    keyName: any,
    value: any,
  ) => {
    const { extraTexts } = this.state;
    if (!extraTexts[field][idx]) {
      extraTexts[field][idx] = {};
    }
    extraTexts[field][idx][keyName] = value;

    const extra: any = {};
    extra[field] = { value: { idx: { keyName: value } } };
    this.formRef?.current?.setFieldsValue({ extra });
    this.setState({
      extraTexts,
    });
  };

  onMoveUpExtraTextsField = (field: string, idx: number) => {
    const { extraTexts } = this.state;
    // 移动
    if (idx > 0) {
      const tmp = extraTexts[field][idx];
      extraTexts[field][idx] = extraTexts[field][idx - 1];
      extraTexts[field][idx - 1] = tmp;
      const extra: any = {};
      extra[field] = { value: extraTexts[field] };
      this.formRef?.current?.setFieldsValue({ extra });
      this.setState({
        extraTexts,
      });
    }
  };

  onMoveDownExtraTextsField = (field: string, idx: number) => {
    const { extraTexts } = this.state;
    // 移动
    if (idx < extraTexts[field].length - 1) {
      const tmp = extraTexts[field][idx];
      extraTexts[field][idx] = extraTexts[field][idx + 1];
      extraTexts[field][idx + 1] = tmp;
      const extra: any = {};
      extra[field] = { value: extraTexts[field] };
      this.formRef?.current?.setFieldsValue({ extra });
      this.setState({
        extraTexts,
      });
    }
  };

  onRemoveExtraTextsField = (field: string, idx: number) => {
    const { extraTexts } = this.state;
    Modal.confirm({
      title: this.props.intl.formatMessage({
        id: 'content.module.field.delete.confirm',
      }),
      content: this.props.intl.formatMessage({
        id: 'content.module.field.delete.content',
      }),
      onOk: () => {
        if (extraTexts[field].length === 1) {
          extraTexts[field] = [];
        } else {
          extraTexts[field].splice(idx, 1);
        }
        const extra: any = {};
        extra[field] = { value: extraTexts[field] };
        this.formRef?.current?.setFieldsValue({ extra });
        this.setState({
          extraTexts,
        });
      },
    });
  };

  handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      const values = this.formRef.current?.getFieldsFormatValue?.();
      // 自动保存
      this.onSubmit(values);

      event.preventDefault();
    }
  };

  aiGenerateArticle = () => {
    const values = this.formRef.current?.getFieldsFormatValue?.() || {};
    this.setState({
      aiTitle: values.title,
      aiVisible: true,
    });
  };

  onHideAiGenerate = () => {
    this.setState({
      aiVisible: false,
    });
  };

  onFinishAiGenerate = async (values: any) => {
    this.onHideAiGenerate();
    this.formRef.current?.setFieldsValue({ title: values.title });
    //
    let content = values.content.trim();

    this.setContent(content);
    this.editorRef.current?.setInnerContent(content);
  };

  onSearchArchives = (e: any) => {
    getArchives({ title: e, pageSize: 10 }).then((res) => {
      // 如果是已经有选择的 ParentId,则把它加入到开头
      const searchItems: any[] = [];
      if (this.state.selectedArchives) {
        searchItems.push(...this.state.selectedArchives);
      } else {
        searchItems.push({
          id: 0,
          title: this.props.intl.formatMessage({
            id: 'content.parent_id.empty',
          }),
        });
      }
      this.setState({
        searchArchives: searchItems.concat(res.data || []),
      });
    });
  };

  onSearchUsers = (e: any) => {
    pluginGetUsers({ q: e, pageSize: 10 }).then((res) => {
      // 如果是已经有选择的 ParentId,则把它加入到开头
      const searchItems: any[] = [];
      if (this.state.selectedUser.id) {
        searchItems.push(this.state.selectedUser);
      } else {
        searchItems.push({
          id: 0,
          title: this.props.intl.formatMessage({
            id: 'content.parent_id.empty',
          }),
        });
      }
      this.setState({
        searchUsers: searchItems.concat(res.data || []),
      });
    });
  };

  render() {
    const {
      archive,
      content,
      extraContent,
      extraTexts,
      module,
      fetched,
      keywordsVisible,
      searchedTags,
      aiTitle,
      aiVisible,
      contentSetting,
      archiveSearchVisible,
      relations,
      searchArchives,
      searchUsers,
      newKey,
    } = this.state;
    return (
      <NewContainer
        title={
          archive.id > 0
            ? this.props.intl.formatMessage({ id: 'content.archive.edit' })
            : this.props.intl.formatMessage({ id: 'content.archive.add' })
        }
        onTabChange={(key) => this.onTabChange(key)}
      >
        <Card key={newKey} onKeyDown={this.handleKeyDown}>
          {fetched && (
            <ProForm
              initialValues={archive}
              layout="horizontal"
              formRef={this.formRef}
              onFinish={this.onSubmit}
            >
              <Row gutter={20}>
                <Col sm={18} xs={24}>
                  <ProFormText
                    name="title"
                    label={
                      module.title_name ||
                      this.props.intl.formatMessage({
                        id: 'content.title.name',
                      })
                    }
                  />
                  <ProFormCheckbox.Group
                    name="flag"
                    label={this.props.intl.formatMessage({
                      id: 'content.flag.name',
                    })}
                    valueEnum={{
                      h: this.props.intl.formatMessage({
                        id: 'content.flag.h',
                      }),
                      c: this.props.intl.formatMessage({
                        id: 'content.flag.c',
                      }),
                      f: this.props.intl.formatMessage({
                        id: 'content.flag.f',
                      }),
                      a: this.props.intl.formatMessage({
                        id: 'content.flag.a',
                      }),
                      s: this.props.intl.formatMessage({
                        id: 'content.flag.s',
                      }),
                      b: this.props.intl.formatMessage({
                        id: 'content.flag.b',
                      }),
                      p: this.props.intl.formatMessage({
                        id: 'content.flag.p',
                      }),
                      j: this.props.intl.formatMessage({
                        id: 'content.flag.j',
                      }),
                    }}
                  />
                  <ProFormText
                    name="keywords"
                    label={this.props.intl.formatMessage({
                      id: 'content.keywords.name',
                    })}
                    fieldProps={{
                      suffix: (
                        <Space size={16}>
                          <span
                            className="link"
                            onClick={this.handleExtractKeywords}
                          >
                            <FormattedMessage id="content.keywords.extract" />
                          </span>
                          <span
                            className="link"
                            onClick={this.handleChooseKeywords}
                          >
                            <FormattedMessage id="content.keywords.select" />
                          </span>
                        </Space>
                      ),
                    }}
                  />
                  <ProFormTextArea
                    name="description"
                    label={this.props.intl.formatMessage({
                      id: 'content.description.name',
                    })}
                    extra={
                      <Space size={16}>
                        <span
                          className="link extract-tag"
                          onClick={this.handleExtractDescription}
                        >
                          <FormattedMessage id="content.description.extract" />
                        </span>
                      </Space>
                    }
                  />

                  <CollapseItem
                    header={this.props.intl.formatMessage({
                      id: 'content.param.other',
                    })}
                    showArrow
                    key="1"
                  >
                    <Row gutter={20}>
                      <Col sm={12} xs={24}>
                        <ProFormText
                          label={this.props.intl.formatMessage({
                            id: 'content.origin-url.name',
                          })}
                          name="origin_url"
                          placeholder={this.props.intl.formatMessage({
                            id: 'content.field.default',
                          })}
                          extra={this.props.intl.formatMessage({
                            id: 'content.origin-url.description',
                          })}
                        />
                      </Col>
                      <Col sm={12} xs={24}>
                        <ProFormText
                          name="seo_title"
                          label={this.props.intl.formatMessage({
                            id: 'content.seo-title.name',
                          })}
                          placeholder={this.props.intl.formatMessage({
                            id: 'content.seo-title.placeholder',
                          })}
                          extra={this.props.intl.formatMessage({
                            id: 'content.seo-title.description',
                          })}
                        />
                      </Col>
                      <Col sm={12} xs={24}>
                        <ProFormText
                          name="canonical_url"
                          label={this.props.intl.formatMessage({
                            id: 'content.canonical-url.name',
                          })}
                          placeholder={this.props.intl.formatMessage({
                            id: 'content.canonical-url.placeholder',
                          })}
                          extra={this.props.intl.formatMessage({
                            id: 'content.canonical-url.description',
                          })}
                        />
                      </Col>
                      <Col sm={12} xs={24}>
                        <ProFormText
                          name="fixed_link"
                          label={this.props.intl.formatMessage({
                            id: 'content.fixed-link.name',
                          })}
                          placeholder={this.props.intl.formatMessage({
                            id: 'content.canonical-url.placeholder',
                          })}
                          extra={this.props.intl.formatMessage({
                            id: 'content.fixed-link.description',
                          })}
                        />
                      </Col>
                      <Col sm={12} xs={24}>
                        <ProFormSelect
                          label={this.props.intl.formatMessage({
                            id: 'content.archive-template.name',
                          })}
                          showSearch
                          name="template"
                          request={async () => {
                            const res = await getDesignTemplateFiles({});
                            const data = [
                              {
                                path: '',
                                remark: this.props.intl.formatMessage({
                                  id: 'content.default-template',
                                }),
                              },
                            ].concat(res.data || []);
                            for (const i in data) {
                              if (!data[i].remark) {
                                data[i].remark = data[i].path;
                              } else {
                                data[i].remark =
                                  data[i].path + '(' + data[i].remark + ')';
                              }
                            }
                            return data;
                          }}
                          fieldProps={{
                            fieldNames: {
                              label: 'remark',
                              value: 'path',
                            },
                          }}
                          extra={this.props.intl.formatMessage({
                            id: 'content.archive-template.description',
                          })}
                        />
                      </Col>
                      <Col sm={12} xs={24}>
                        <ProFormDigit
                          label={this.props.intl.formatMessage({
                            id: 'content.price.name',
                          })}
                          name="price"
                          fieldProps={{
                            precision: 0,
                            addonAfter: this.props.intl.formatMessage({
                              id: 'content.price.suffix',
                            }),
                          }}
                          extra={this.props.intl.formatMessage({
                            id: 'content.papriceram.description',
                          })}
                        />
                      </Col>
                      <Col sm={12} xs={24}>
                        <ProFormDigit
                          label={this.props.intl.formatMessage({
                            id: 'content.stock.name',
                          })}
                          name="stock"
                          fieldProps={{
                            precision: 0,
                            addonAfter: this.props.intl.formatMessage({
                              id: 'content.stock.suffix',
                            }),
                          }}
                        />
                      </Col>
                      <Col sm={12} xs={24}>
                        <ProFormSelect
                          name="read_level"
                          label={this.props.intl.formatMessage({
                            id: 'content.read-level.name',
                          })}
                          request={async () => {
                            const res = await pluginGetUserGroups({});
                            return [
                              {
                                level: 0,
                                title: this.props.intl.formatMessage({
                                  id: 'content.unlimit',
                                }),
                                id: 0,
                              },
                            ].concat(res.data || []);
                          }}
                          fieldProps={{
                            fieldNames: {
                              label: 'title',
                              value: 'level',
                            },
                            optionItemRender(item: any) {
                              return (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: 'L' + item.level + item.title,
                                  }}
                                ></div>
                              );
                            },
                          }}
                          extra={this.props.intl.formatMessage({
                            id: 'content.read-level.description',
                          })}
                        />
                      </Col>
                      <Col sm={12} xs={24}>
                        <ProFormText
                          name="password"
                          label={this.props.intl.formatMessage({
                            id: 'content.password.name',
                          })}
                          placeholder={this.props.intl.formatMessage({
                            id: 'content.password.placeholder',
                          })}
                          extra={this.props.intl.formatMessage({
                            id: 'content.password.description',
                          })}
                        />
                      </Col>
                    </Row>
                  </CollapseItem>
                  {module.fields && (
                    <CollapseItem
                      header={this.props.intl.formatMessage({
                        id: 'content.param.extra-fields',
                      })}
                      open
                      showArrow
                      key="2"
                    >
                      <Row gutter={20}>
                        {module.fields?.map(
                          (item: any, index: number) =>
                            item.type !== 'editor' && (
                              <Col sm={12} xs={24} key={index}>
                                {item.type === 'text' ? (
                                  <ProFormText
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                    required={item.required ? true : false}
                                    placeholder={
                                      item.content &&
                                      this.props.intl.formatMessage({
                                        id: 'content.param.default',
                                      }) + item.content
                                    }
                                  />
                                ) : item.type === 'number' ? (
                                  <ProFormDigit
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                    required={item.required ? true : false}
                                    placeholder={
                                      item.content &&
                                      this.props.intl.formatMessage({
                                        id: 'content.param.default',
                                      }) + item.content
                                    }
                                  />
                                ) : item.type === 'textarea' ? (
                                  <ProFormTextArea
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                    required={item.required ? true : false}
                                    placeholder={
                                      item.content &&
                                      this.props.intl.formatMessage({
                                        id: 'content.param.default',
                                      }) + item.content
                                    }
                                  />
                                ) : item.type === 'editor' ? (
                                  ''
                                ) : item.type === 'radio' ? (
                                  <ProFormRadio.Group
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                    request={async () => {
                                      const tmpData = item.content.split('\n');
                                      const data = [];
                                      for (const item1 of tmpData) {
                                        data.push({
                                          label: item1,
                                          value: item1,
                                        });
                                      }
                                      return data;
                                    }}
                                  />
                                ) : item.type === 'checkbox' ? (
                                  <ProFormCheckbox.Group
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                    request={async () => {
                                      const tmpData = item.content.split('\n');
                                      const data = [];
                                      for (const item1 of tmpData) {
                                        data.push({
                                          label: item1,
                                          value: item1,
                                        });
                                      }
                                      return data;
                                    }}
                                  />
                                ) : item.type === 'select' ? (
                                  <ProFormSelect
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                    request={async () => {
                                      const tmpData = item.content.split('\n');
                                      const data = [];
                                      for (const item1 of tmpData) {
                                        data.push({
                                          label: item1,
                                          value: item1,
                                        });
                                      }
                                      return data;
                                    }}
                                  />
                                ) : item.type === 'image' ? (
                                  <ProFormText
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                  >
                                    {archive.extra?.[item.field_name]?.value ? (
                                      <div className="ant-upload-item">
                                        <Image
                                          preview={{
                                            src: archive.extra?.[
                                              item.field_name
                                            ]?.value,
                                          }}
                                          src={
                                            archive.extra?.[item.field_name]
                                              ?.value
                                          }
                                        />
                                        <span
                                          className="delete"
                                          onClick={this.handleCleanExtraField.bind(
                                            this,
                                            item.field_name,
                                          )}
                                        >
                                          <DeleteOutlined />
                                        </span>
                                      </div>
                                    ) : (
                                      <AttachmentSelect
                                        onSelect={this.handleUploadExtraField.bind(
                                          this,
                                          item.field_name,
                                        )}
                                        open={false}
                                      >
                                        <div className="ant-upload-item">
                                          <div className="add">
                                            <PlusOutlined />
                                            <div style={{ marginTop: 8 }}>
                                              <FormattedMessage id="setting.system.upload" />
                                            </div>
                                          </div>
                                        </div>
                                      </AttachmentSelect>
                                    )}
                                  </ProFormText>
                                ) : item.type === 'images' ? (
                                  <ProFormText
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                  >
                                    {archive.extra?.[item.field_name]?.value
                                      ?.length
                                      ? archive.extra[
                                          item.field_name
                                        ].value.map(
                                          (inner: string, idx: number) => (
                                            <div
                                              className="ant-upload-item"
                                              key={idx}
                                            >
                                              <Image
                                                preview={{
                                                  src: inner,
                                                }}
                                                src={inner}
                                              />
                                              <div className="ant-upload-item-action">
                                                <Tag
                                                  onClick={this.handleMoveExtraFieldItem.bind(
                                                    this,
                                                    item.field_name,
                                                    idx,
                                                    'up',
                                                  )}
                                                >
                                                  <LeftOutlined />
                                                </Tag>
                                                <Tag
                                                  color="red"
                                                  onClick={this.handleCleanExtraFieldItem.bind(
                                                    this,
                                                    item.field_name,
                                                    idx,
                                                  )}
                                                >
                                                  <DeleteOutlined />
                                                </Tag>
                                                <Tag
                                                  onClick={this.handleMoveExtraFieldItem.bind(
                                                    this,
                                                    item.field_name,
                                                    idx,
                                                    'down',
                                                  )}
                                                >
                                                  <RightOutlined />
                                                </Tag>
                                              </div>
                                            </div>
                                          ),
                                        )
                                      : null}
                                    <AttachmentSelect
                                      onSelect={this.handleUploadExtraFieldItem.bind(
                                        this,
                                        item.field_name,
                                      )}
                                      open={false}
                                      multiple={true}
                                    >
                                      <div className="ant-upload-item">
                                        <div className="add">
                                          <PlusOutlined />
                                          <div style={{ marginTop: 8 }}>
                                            <FormattedMessage id="setting.system.upload" />
                                          </div>
                                        </div>
                                      </div>
                                    </AttachmentSelect>
                                  </ProFormText>
                                ) : item.type === 'file' ? (
                                  <ProFormText
                                    name={['extra', item.field_name, 'value']}
                                    label={item.name}
                                  >
                                    {archive.extra?.[item.field_name]?.value ? (
                                      <div className="ant-upload-item ant-upload-file">
                                        <span>
                                          {
                                            archive.extra?.[item.field_name]
                                              ?.value
                                          }
                                        </span>
                                        <span
                                          className="delete"
                                          onClick={this.handleCleanExtraField.bind(
                                            this,
                                            item.field_name,
                                          )}
                                        >
                                          <DeleteOutlined />
                                        </span>
                                      </div>
                                    ) : (
                                      <AttachmentSelect
                                        onSelect={this.handleUploadExtraField.bind(
                                          this,
                                          item.field_name,
                                        )}
                                        open={false}
                                      >
                                        <Button>
                                          <FormattedMessage id="setting.system.upload" />
                                        </Button>
                                      </AttachmentSelect>
                                    )}
                                  </ProFormText>
                                ) : item.type === 'texts' ? (
                                  <ProFormText label={item.name}>
                                    <div className="text-groups">
                                      <div className="text-group">
                                        <div className="text-key">Key</div>
                                        <div className="text-value">Value</div>
                                        <div className="text-action"></div>
                                      </div>
                                      {extraTexts?.[item.field_name]?.length
                                        ? extraTexts[item.field_name].map(
                                            (inner: any, idx: number) => (
                                              <div
                                                className="text-group"
                                                key={idx}
                                              >
                                                <div className="text-key">
                                                  <ProFormText
                                                    name={[
                                                      'extra',
                                                      item.field_name,
                                                      'value',
                                                      idx,
                                                      'key',
                                                    ]}
                                                    fieldProps={{
                                                      onChange: (e: any) => {
                                                        this.onChangeExtraTextsField(
                                                          item.field_name,
                                                          idx,
                                                          'key',
                                                          e.target.value,
                                                        );
                                                      },
                                                    }}
                                                  />
                                                </div>
                                                <div className="text-value">
                                                  <ProFormText
                                                    name={[
                                                      'extra',
                                                      item.field_name,
                                                      'value',
                                                      idx,
                                                      'value',
                                                    ]}
                                                    fieldProps={{
                                                      onChange: (e: any) => {
                                                        this.onChangeExtraTextsField(
                                                          item.field_name,
                                                          idx,
                                                          'value',
                                                          e.target.value,
                                                        );
                                                      },
                                                    }}
                                                  />
                                                </div>
                                                <div className="text-action">
                                                  <Tag
                                                    onClick={() =>
                                                      this.onMoveUpExtraTextsField(
                                                        item.field_name,
                                                        idx,
                                                      )
                                                    }
                                                  >
                                                    <UpOutlined />
                                                  </Tag>
                                                  <Tag
                                                    onClick={() =>
                                                      this.onMoveDownExtraTextsField(
                                                        item.field_name,
                                                        idx,
                                                      )
                                                    }
                                                  >
                                                    <DownOutlined />
                                                  </Tag>
                                                  <Tag
                                                    color="red"
                                                    onClick={() =>
                                                      this.onRemoveExtraTextsField(
                                                        item.field_name,
                                                        idx,
                                                      )
                                                    }
                                                  >
                                                    <DeleteOutlined />
                                                  </Tag>
                                                </div>
                                              </div>
                                            ),
                                          )
                                        : null}
                                      <div className="text-group">
                                        <div className="text-key">
                                          <Tag
                                            color="blue"
                                            className="add-line"
                                            onClick={() =>
                                              this.onAddExtraTextsField(
                                                item.field_name,
                                              )
                                            }
                                          >
                                            {this.props.intl.formatMessage({
                                              id: 'content.param.add-line',
                                            })}
                                          </Tag>
                                        </div>
                                      </div>
                                    </div>
                                  </ProFormText>
                                ) : item.type === 'archive' ? (
                                  <ProFormText label={item.name}>
                                    <ProFormSelect
                                      name={['extra', item.field_name, 'value']}
                                      showSearch
                                      mode="multiple"
                                      options={searchArchives.map((a: any) => ({
                                        title: a.title,
                                        label: a.title,
                                        value: a.id,
                                      }))}
                                      fieldProps={{
                                        onSearch: (e) => {
                                          this.onSearchArchives(e);
                                        },
                                      }}
                                    />
                                  </ProFormText>
                                ) : item.type === 'category' ? (
                                  <ProFormText label={item.name}>
                                    <ProFormSelect
                                      showSearch
                                      name={['extra', item.field_name, 'value']}
                                      mode={'single'}
                                      request={async () => {
                                        const res = await getCategories({
                                          type: 1,
                                        });
                                        const categories = (res.data || []).map(
                                          (cat: any) => ({
                                            spacer: cat.spacer,
                                            label:
                                              cat.title +
                                              (cat.status === 1
                                                ? ''
                                                : this.props.intl.formatMessage(
                                                    {
                                                      id: 'setting.nav.hide',
                                                    },
                                                  )),
                                            value: cat.id,
                                          }),
                                        );
                                        return categories;
                                      }}
                                      fieldProps={{
                                        optionItemRender(item: any) {
                                          return (
                                            <div
                                              dangerouslySetInnerHTML={{
                                                __html:
                                                  item.spacer + item.label,
                                              }}
                                            ></div>
                                          );
                                        },
                                      }}
                                    />
                                  </ProFormText>
                                ) : null}
                              </Col>
                            ),
                        )}
                      </Row>
                      {module.fields?.map(
                        (item: any, index: number) =>
                          item.type === 'editor' && (
                            <ProFormText
                              key={index}
                              label={item.name}
                              required={item.required ? true : false}
                              extra={
                                item.content &&
                                this.props.intl.formatMessage({
                                  id: 'content.param.default',
                                }) + item.content
                              }
                            >
                              {contentSetting.editor === 'markdown' ? (
                                <MarkdownEditor
                                  className="mb-normal"
                                  setContent={this.setExtraContent.bind(
                                    this,
                                    item.field_name,
                                  )}
                                  content={extraContent[item.field_name] || ''}
                                  ref={null}
                                />
                              ) : (
                                <WangEditor
                                  className="mb-normal"
                                  setContent={this.setExtraContent.bind(
                                    this,
                                    item.field_name,
                                  )}
                                  content={extraContent[item.field_name] || ''}
                                  key={item.field_name}
                                  field={item.field_name}
                                  ref={null}
                                />
                              )}
                            </ProFormText>
                          ),
                      )}
                    </CollapseItem>
                  )}
                  {contentSetting.editor === 'markdown' ? (
                    <MarkdownEditor
                      className="mb-normal"
                      setContent={this.setContent}
                      content={content}
                      ref={this.editorRef}
                    />
                  ) : (
                    <WangEditor
                      className="mb-normal"
                      setContent={this.setContent}
                      content={content}
                      key="content"
                      field="content"
                      ref={this.editorRef}
                    />
                  )}
                </Col>
                <Col sm={6} xs={24}>
                  <div className="mb-normal">
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Button
                          block
                          type="primary"
                          onClick={() => {
                            this.onSubmit(
                              this.formRef.current?.getFieldsFormatValue?.() ||
                                {},
                            );
                          }}
                        >
                          <FormattedMessage id="content.submit.ok" />
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Button
                          block
                          onClick={() => {
                            const values =
                              this.formRef.current?.getFieldsFormatValue?.() ||
                              {};
                            values.draft = true;
                            this.onSubmit(values);
                          }}
                        >
                          <FormattedMessage id="content.submit.draft" />
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Button
                          block
                          onClick={() => {
                            this.aiGenerateArticle();
                          }}
                        >
                          <FormattedMessage id="content.submit.aigenerate" />
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Button
                          block
                          onClick={() => {
                            history.back();
                          }}
                        >
                          <FormattedMessage id="design.back" />
                        </Button>
                      </Col>
                    </Row>
                  </div>
                  <Card
                    className="aside-card"
                    size="small"
                    title={this.props.intl.formatMessage({
                      id: 'content.category.name',
                    })}
                  >
                    <ProFormSelect
                      //label="所属分类"
                      showSearch
                      name="category_ids"
                      width="lg"
                      mode={
                        contentSetting.multi_category === 1
                          ? 'multiple'
                          : 'single'
                      }
                      request={async () => {
                        const res = await getCategories({ type: 1 });
                        const categories = (res.data || []).map((cat: any) => ({
                          spacer: cat.spacer,
                          label:
                            cat.title +
                            (cat.status === 1
                              ? ''
                              : this.props.intl.formatMessage({
                                  id: 'setting.nav.hide',
                                })),
                          value: cat.id,
                        }));
                        if (categories.length === 0) {
                          Modal.error({
                            title: this.props.intl.formatMessage({
                              id: 'content.category.error',
                            }),
                            onOk: () => {
                              history.push('/archive/category');
                            },
                          });
                        }
                        return categories;
                      }}
                      fieldProps={{
                        optionItemRender(item) {
                          return (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: item.spacer + item.label,
                              }}
                            ></div>
                          );
                        },
                        onChange: this.onChangeSelectCategory,
                      }}
                      extra={
                        <div>
                          <FormattedMessage id="content.module.name" />:{' '}
                          {module.name}
                        </div>
                      }
                    />
                  </Card>
                  <Card
                    className="aside-card"
                    size="small"
                    title={this.props.intl.formatMessage({
                      id: 'content.images.name',
                    })}
                  >
                    <ProFormText>
                      {archive.images?.length
                        ? archive.images.map((item: string, index: number) => (
                            <div className="ant-upload-item" key={index}>
                              <Image
                                preview={{
                                  src: item,
                                }}
                                src={item}
                              />
                              <span
                                className="delete"
                                onClick={this.handleCleanLogo.bind(this, index)}
                              >
                                <DeleteOutlined />
                              </span>
                            </div>
                          ))
                        : null}
                      <AttachmentSelect
                        onSelect={this.handleSelectImages}
                        open={false}
                        multiple={true}
                      >
                        <div className="ant-upload-item">
                          <div className="add">
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>
                              <FormattedMessage id="setting.system.upload" />
                            </div>
                          </div>
                        </div>
                      </AttachmentSelect>
                    </ProFormText>
                  </Card>
                  <Card
                    className="aside-card"
                    size="small"
                    title={this.props.intl.formatMessage({
                      id: 'content.url-token.name',
                    })}
                  >
                    <ProFormText
                      name="url_token"
                      placeholder={this.props.intl.formatMessage({
                        id: 'content.url-token.placeholder',
                      })}
                      extra={this.props.intl.formatMessage({
                        id: 'content.url-token.tips',
                      })}
                    />
                  </Card>
                  <Card
                    className="aside-card"
                    size="small"
                    title={this.props.intl.formatMessage({
                      id: 'content.create-time.name',
                    })}
                  >
                    <ProFormDateTimePicker
                      name="created_moment"
                      placeholder={this.props.intl.formatMessage({
                        id: 'content.url-token.placeholder',
                      })}
                      extra={this.props.intl.formatMessage({
                        id: 'content.create-time.description',
                      })}
                      transform={(value) => {
                        return {
                          created_time: value ? dayjs(value).unix() : 0,
                        };
                      }}
                    />
                  </Card>
                  <Card
                    className="aside-card"
                    size="small"
                    title={this.props.intl.formatMessage({
                      id: 'content.tag.name',
                    })}
                  >
                    <ProFormSelect
                      mode="tags"
                      name="tags"
                      valueEnum={searchedTags}
                      placeholder={this.props.intl.formatMessage({
                        id: 'content.tag.placeholder',
                      })}
                      fieldProps={{
                        tokenSeparators: [',', '，'],
                        onInputKeyDown: this.onChangeTagInput,
                        onFocus: this.onChangeTagInput,
                      }}
                      extra={this.props.intl.formatMessage({
                        id: 'content.tag.placeholder',
                      })}
                    />
                  </Card>
                  <Card
                    className="aside-card"
                    size="small"
                    title={this.props.intl.formatMessage({
                      id: 'content.author.name',
                    })}
                    extra={
                      <Tag
                        className="link"
                        onClick={() => {
                          history.push('/plugin/user');
                        }}
                      >
                        <FormattedMessage id="setting.action.add" />
                      </Tag>
                    }
                  >
                    <ProFormSelect
                      name="user_id"
                      showSearch
                      options={searchUsers.map((a: any) => ({
                        label: a.user_name,
                        value: a.id,
                      }))}
                      fieldProps={{
                        onSearch: (e) => {
                          this.onSearchUsers(e);
                        },
                      }}
                    />
                  </Card>
                  <Card
                    className="aside-card"
                    size="small"
                    title={this.props.intl.formatMessage({
                      id: 'content.parent_id.name',
                    })}
                  >
                    <ProFormSelect
                      name="parent_id"
                      showSearch
                      options={searchArchives.map((a: any) => ({
                        title: a.title,
                        label: a.title,
                        value: a.id,
                        disabled: a.id === archive.id,
                      }))}
                      fieldProps={{
                        onSearch: (e) => {
                          this.onSearchArchives(e);
                        },
                      }}
                    />
                  </Card>
                  <Card
                    className="aside-card"
                    size="small"
                    title={this.props.intl.formatMessage({
                      id: 'content.relation.name',
                    })}
                    extra={
                      <Tag
                        className="link"
                        onClick={this.handleShowArchiveSearchs}
                      >
                        <FormattedMessage id="setting.action.add" />
                      </Tag>
                    }
                  >
                    {relations.map((item: any, index: number) => (
                      <div className="relation-item" key={item.id}>
                        <div className="name">{item.title}</div>
                        <div
                          className="close link"
                          onClick={this.handleRemoveRelation.bind(this, index)}
                        >
                          <CloseOutlined />
                        </div>
                      </div>
                    ))}
                  </Card>
                </Col>
              </Row>
            </ProForm>
          )}
        </Card>
        {keywordsVisible && (
          <Keywords
            open={keywordsVisible}
            onCancel={this.handleHideKeywords}
            onSubmit={this.handleSelectedKeywords}
          />
        )}
        {aiVisible && (
          <AiGenerate
            open={aiVisible}
            title={aiTitle}
            editor={contentSetting.editor}
            onCancel={this.onHideAiGenerate}
            onSubmit={this.onFinishAiGenerate}
          />
        )}
        {archiveSearchVisible && (
          <ArchiveSearch
            open={archiveSearchVisible}
            onCancel={this.handleHideArchiveSearchs}
            onSubmit={this.handleSelectedArchives}
          />
        )}
      </NewContainer>
    );
  }
}

export default injectIntl(ArchiveForm);
