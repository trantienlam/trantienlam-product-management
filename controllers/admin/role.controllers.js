const Role = require("../../models/role.model");
const systemConfix = require("../../config/system");
// [GET] /admin/role
module.exports.index = async (req, res) => {
  let find = {
    deleted: false,
  };
  const records = await Role.find(find);
  res.render("admin/pages/roles/index", {
    pageTitle: "Trang nhóm quyền",
    records: records,
  });
};

// [GET] /admin/role/create
module.exports.create = async (req, res) => {
  res.render("admin/pages/roles/create", {
    pageTitle: "Tạo nhóm quyền",
  });
};

// [POST] /admin/role/create
module.exports.createPost = async (req, res) => {
  console.log(req.body);
  const record = new Role(req.body);
  await record.save();
  res.redirect(`${systemConfix.prefixAdmin}/roles`);
};

// [GET] /admin/role/detail/id
module.exports.detail = async (req, res) => {
  const id = req.params.id;
  let find = {
    deleted: false,
    _id: id,
  };
  const data = await Role.findOne(find);
  if (!data) {
    req.flash("error", "Không tìm thấy nhóm quyền");
    return res.redirect(`${systemConfix.prefixAdmin}/roles`);
  }
  res.render("admin/pages/roles/detail", {
    pageTitle: "Chi tiết nhóm quyền",
    data: data,
  });
};

// [GET] /admin/role/edit/id
module.exports.edit = async (req, res) => {
  const id = req.params.id;
  let find = {
    deleted: false,
    _id: id,
  };
  const data = await Role.findOne(find);
  res.render("admin/pages/roles/edit", {
    pageTitle: "Chỉnh sửa nhóm quyền",
    data: data,
  });
};

// [PATCH] /admin/role/edit/id
module.exports.editPatch = async (req, res) => {
  try {
    const id = req.params.id;
    await Role.updateOne({ _id: id }, req.body);
    req.flash("success", "Cập nhật thành công");
    res.redirect(req.get("referrer") || "/");
  } catch (error) {
    req.flash("error", " Cập nhật thất bại");
  }
};

// [GET] /admin/role/permissions
module.exports.permissions = async (req, res) => {
  let find = {
    deleted: false,
  };
  const records = await Role.find(find);
  res.render("admin/pages/roles/permissions", {
    pageTitle: "Phân quyền",
    records: records,
  });
};

// [PATCH] /admin/role/permissions
module.exports.permissionsPatch = async (req, res) => {
  try {
    const permissions = JSON.parse(req.body.permissions);
   // console.log(permissions);
    for (const item of permissions) {
      await Role.updateOne(
        {
          _id: item.id,
        },
        {
          permission: item.permissions,
        }
      );
    }
    req.flash("success", " Cập nhật phân quyền thành công");
    res.redirect(req.get("referrer") || "/");
  } catch (error) {
    req.flash("error", "Cập nhật lỗi");
  }
};
