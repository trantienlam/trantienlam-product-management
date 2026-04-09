const md5 = require("md5");

const Account = require("../../models/account.model");
const Role = require("../../models/role.model");
const systemConfig = require("../../config/system");

/** Chuẩn hóa URL avatar (https / đường dẫn tuyệt đối từ root) */
function normalizeAvatarUrl(avatar) {
  if (avatar == null || typeof avatar !== "string") return "";
  const t = avatar.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t) || t.startsWith("//")) return t;
  if (t.startsWith("/")) return t;
  return `/${t.replace(/^\/+/, "")}`;
}

// [GET] /admin/accounts
module.exports.index = async (req, res) => {
  let find = {
    deleted: false,
  };
  const raw = await Account.find(find).select("-password -token").lean();
  const records = [];
  for (const record of raw) {
    const role = await Role.findOne({
      _id: record.role_id,
      deleted: false,
    });
    records.push({
      ...record,
      id: record._id,
      role,
      avatarUrl: normalizeAvatarUrl(record.avatar),
    });
  }
  res.render("admin/pages/accounts/index", {
    pageTitle: "Danh sách tài khoản",
    records: records,
  });
};

// [GET] admin/account/create
module.exports.create = async (req, res) => {
  const roles = await Role.find({
    deleted: false,
  });
  res.render("admin/pages/accounts/create", {
    pageTitle: "Tạo mới tài khoản",
    roles: roles,
  });
};

// [POST] admin/account/create
module.exports.createPost = async (req, res) => {
  const emailExits = await Account.findOne({
    email: req.body.email,
    deleted: false,
  });
  if (emailExits) {
    req.flash("error", "Email đã tồn tại");
    res.redirect("back");
  } else {
    req.body.password = md5(req.body.password);
    const record = new Account(req.body);
    await record.save();
    res.redirect(`${systemConfig.prefixAdmin}/accounts`);
  }
};

//[GET] admin/account/edit/:id
module.exports.edit = async (req, res) => {
  let find = {
    _id: req.params.id,
    deleted: false,
  };
  try {
    const data = await Account.findOne(find);
    const roles = await Role.find({
      deleted: false,
    });
    res.render("admin/pages/accounts/edit", {
      pageTitle: "Chỉnh sửa tài khoản",
      data: data,
      roles: roles,
    });
  } catch (error) {
    res.redirect(`/${systemConfig.prefixAdmin}/accounts`);
  }
};

// [PATCH] admin/account/edit/:id
module.exports.editPatch = async (req, res) => {
  const id = req.params.id;
  const emailExits = await Account.findOne({
    _id: { $ne: id },
    email: req.body.email,
    deleted: false,
  });

  if (emailExits) {
    req.flash("error", "Email đã tồn tại");
  } else {
    if (req.body.password) {
      req.body.password = md5(req.body.password);
    } else {
      delete req.body.password;
    }
    if (!req.body.avatar) {
      delete req.body.avatar;
    }
    await Account.updateOne({ _id: id }, req.body);
    req.flash("success", "Cập nhật thành công");
  }
  res.redirect("back");
};

//[PATCH] change-status/:stat us/:id
module.exports.changeStatus = async (req, res) => {
  try {
    if (!req.user.role_id?.permission?.includes("accounts_change_status")) {
      return res.status(403).send("Không có quyền");
    } else {
      const status = req.params.status;
      const id = req.params.id;
      const updatedBy = {
        account_id: res.locals.user.id,
        updatedAt: new Date(),
      };
      await Account.updateOne(
        { _id: id },
        {
          status: status,
          $push: { updatedBy: updatedBy },
        },
      );

      req.flash("success", "Cập nhật thành công!");

      res.redirect("back");
    }
  } catch (error) {
    console.log(error);
    res.redirect("back");
  }
};

//[GET] admin/account/detail/id
module.exports.detail = async (req, res) => {
  try {
    const find = {
      deleted: false,
      _id: req.params.id,
    };
    const account = await Account.findOne(find).populate("role_id");

    res.render("admin/pages/accounts/detail", {
      pageTitle: "Chi tiết tài khoản",
      account: account,
    });
  } catch (error) {
    console.log(error);
    res.redirect(`${systemConfig.prefixAdmin}/accounts`);
  }
};

//[DELETE] admin/account/delete/id
module.exports.deleteId = async (req, res) => {
  const status = req.params.status;
  const id = req.params.id;

  await Account.updateOne(
    { _id: id },
    {
      deleted: true,
      deletedBy: {
        account_id: res.locals.user.id,
        deletedAt: new Date(),
      },
    },
  );
  req.flash("success", `Đã xóa thành công sản phẩm!`);
  res.redirect("back");
};
