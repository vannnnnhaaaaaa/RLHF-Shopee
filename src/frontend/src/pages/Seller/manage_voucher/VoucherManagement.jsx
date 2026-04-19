import React, { useState, useEffect, useCallback } from 'react';
import { sellerVoucherService } from '../../../services/sellerVoucher';
import './VoucherManagement.scss';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDiscount = (voucher) => {
  // Đã sửa lại thành 'percent' theo chuẩn DB mới
  if (voucher.discount_type === 'percent') {
    const max = voucher.max_discount
      ? `, tối đa ₫${voucher.max_discount.toLocaleString('vi-VN')}`
      : '';
    return `Giảm ${voucher.discount_value}%${max}`;
  }
  return `Giảm ₫${voucher.discount_value.toLocaleString('vi-VN')}`;
};

// Đã cập nhật key khớp với Schema VoucherCreate
const EMPTY_FORM = {
  code: '',
  discount_type: 'fixed', 
  discount_value: '',
  min_spend: '0',
  max_discount: '',
  valid_from: '',
  valid_until: '',
  quantity: '',
};

// ─── Modal Component ────────────────────────────────────────────────────────
const CreateVoucherModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.code.trim()) newErrors.code = 'Mã voucher không được để trống.';
    else if (!/^[A-Z0-9_-]+$/i.test(form.code.trim()))
      newErrors.code = 'Mã voucher chỉ gồm chữ, số, gạch ngang và gạch dưới.';

    if (!form.discount_value || Number(form.discount_value) <= 0)
      newErrors.discount_value = 'Mức giảm phải lớn hơn 0.';

    if (!form.valid_from) newErrors.valid_from = 'Chưa chọn ngày bắt đầu.';
    if (!form.valid_until) newErrors.valid_until = 'Chưa chọn ngày kết thúc.';

    const start = new Date(form.valid_from);
    const end = new Date(form.valid_until);
    if (form.valid_from && form.valid_until && end <= start)
      newErrors.valid_until = 'Ngày kết thúc phải lớn hơn ngày bắt đầu.';

    if (!form.quantity || Number(form.quantity) <= 0)
      newErrors.quantity = 'Số lượng mã phải lớn hơn 0.';

    // Fix validate theo chữ 'percent'
    if (form.discount_type === 'percent' && Number(form.discount_value) > 100)
      newErrors.discount_value = 'Phần trăm giảm không được vượt quá 100%.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError('');

    // Payload đã được Map chuẩn xác với Pydantic Schema ở Backend
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type, 
      discount_value: Number(form.discount_value),
      min_spend: Number(form.min_spend) || 0,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      valid_from: new Date(form.valid_from).toISOString(),
      valid_until: new Date(form.valid_until).toISOString(),
      quantity: Number(form.quantity),
    };

    try {
      await sellerVoucherService.createVoucher(payload);
      onSuccess();
      onClose();
    } catch (err) {
      setServerError(err.message || 'Tạo voucher thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tạo Voucher Mới</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          {/* Mã voucher */}
          <div className="form-group">
            <label>Mã Voucher <span className="required">*</span></label>
            <input
              type="text"
              name="code"
              placeholder="VD: GIAM10K"
              value={form.code}
              onChange={handleChange}
              className={errors.code ? 'input-error' : ''}
            />
            {errors.code && <span className="error-msg">{errors.code}</span>}
          </div>

          {/* Loại giảm + Mức giảm */}
          <div className="form-row">
            <div className="form-group">
              <label>Loại giảm <span className="required">*</span></label>
              <select name="discount_type" value={form.discount_type} onChange={handleChange}>
                <option value="fixed">Giảm theo số tiền</option>
                <option value="percent">Giảm theo phần trăm</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                {form.discount_type === 'percent' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (đ)'} <span className="required">*</span>
              </label>
              <input
                type="number"
                name="discount_value"
                placeholder={form.discount_type === 'percent' ? 'VD: 10' : 'VD: 10000'}
                value={form.discount_value}
                onChange={handleChange}
                min="1"
                className={errors.discount_value ? 'input-error' : ''}
              />
              {errors.discount_value && <span className="error-msg">{errors.discount_value}</span>}
            </div>
          </div>

          {/* Mức giảm tối đa (chỉ khi percent) */}
          {form.discount_type === 'percent' && (
            <div className="form-group">
              <label>Mức giảm tối đa (đ)</label>
              <input
                type="number"
                name="max_discount"
                placeholder="VD: 50000"
                value={form.max_discount}
                onChange={handleChange}
                min="0"
              />
            </div>
          )}

          {/* Đơn hàng tối thiểu */}
          <div className="form-group">
            <label>Đơn hàng tối thiểu (đ)</label>
            <input
              type="number"
              name="min_spend"
              placeholder="VD: 50000"
              value={form.min_spend}
              onChange={handleChange}
              min="0"
            />
          </div>

          {/* Thời gian */}
          <div className="form-row">
            <div className="form-group">
              <label>Ngày bắt đầu <span className="required">*</span></label>
              <input
                type="datetime-local"
                name="valid_from"
                value={form.valid_from}
                onChange={handleChange}
                className={errors.valid_from ? 'input-error' : ''}
              />
              {errors.valid_from && <span className="error-msg">{errors.valid_from}</span>}
            </div>
            <div className="form-group">
              <label>Ngày kết thúc <span className="required">*</span></label>
              <input
                type="datetime-local"
                name="valid_until"
                value={form.valid_until}
                onChange={handleChange}
                className={errors.valid_until ? 'input-error' : ''}
              />
              {errors.valid_until && <span className="error-msg">{errors.valid_until}</span>}
            </div>
          </div>

          {/* Số lượng */}
          <div className="form-group">
            <label>Số lượng mã tối đa <span className="required">*</span></label>
            <input
              type="number"
              name="quantity"
              placeholder="VD: 100"
              value={form.quantity}
              onChange={handleChange}
              min="1"
              className={errors.quantity ? 'input-error' : ''}
            />
            {errors.quantity && <span className="error-msg">{errors.quantity}</span>}
          </div>

          {serverError && <div className="server-error">{serverError}</div>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Toggle Switch Component ────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="toggle-slider" />
  </label>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 8;

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await sellerVoucherService.getVouchers(LIMIT, (page - 1) * LIMIT);
      if (res.status === 'success') {
        setVouchers(res.data);
        setTotal(res.metadata?.total || 0);
      }
    } catch (err) {
      setError('Không thể tải danh sách voucher. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleToggle = async (voucher) => {
    setTogglingId(voucher.id);
    try {
      const res = await sellerVoucherService.toggleVoucher(voucher.id);
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === voucher.id ? { ...v, is_active: res.data.is_active } : v
        )
      );
    } catch (err) {
      alert(err.message || 'Cập nhật trạng thái thất bại.');
    } finally {
      setTogglingId(null);
    }
  };

  const isExpired = (endDate) => new Date(endDate) < new Date();

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="voucher-management">
      {/* ── Header ── */}
      <div className="vm-header">
        <div className="vm-header__left">
          <h2>Quản lý Voucher</h2>
          <span className="vm-count">Tổng: {total} voucher</span>
        </div>
        <button className="btn-create" onClick={() => setShowModal(true)}>
          <span>+</span> Tạo Voucher Mới
        </button>
      </div>

      {/* ── Table ── */}
      <div className="vm-table-wrapper">
        {loading ? (
          <div className="vm-loading">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="vm-error">
            <p>{error}</p>
            <button onClick={fetchVouchers}>Thử lại</button>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="vm-empty">
            <p>Chưa có voucher nào. Hãy tạo voucher đầu tiên!</p>
          </div>
        ) : (
          <table className="vm-table">
            <thead>
              <tr>
                <th>Mã Voucher</th>
                <th>Chi tiết giảm</th>
                <th>Đơn tối thiểu</th>
                <th>Thời hạn</th>
                <th>Đã dùng / Giới hạn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => (
                <tr key={voucher.id} className={!voucher.is_active ? 'row--inactive' : ''}>
                  {/* Mã voucher */}
                  <td>
                    <span className="voucher-code">{voucher.code}</span>
                  </td>

                  {/* Chi tiết giảm */}
                  <td>
                    <span className="discount-badge">{formatDiscount(voucher)}</span>
                    {voucher.min_spend > 0 && (
                      <span className="min-order">
                        Đơn từ ₫{voucher.min_spend.toLocaleString('vi-VN')}
                      </span>
                    )}
                  </td>

                  {/* Đơn tối thiểu */}
                  <td className="text-center">
                    {voucher.min_spend > 0
                      ? `₫${voucher.min_spend.toLocaleString('vi-VN')}`
                      : <span className="text-muted">Không</span>}
                  </td>

                  {/* Thời hạn */}
                  <td className="text-center">
                    <div className="date-range">
                      <span>{formatDate(voucher.valid_from)}</span>
                      <span className="date-sep">→</span>
                      <span className={isExpired(voucher.valid_until) ? 'text-red' : ''}>
                        {formatDate(voucher.valid_until)}
                        {isExpired(voucher.valid_until) && ' (Hết hạn)'}
                      </span>
                    </div>
                  </td>

                  {/* Đã dùng / Giới hạn */}
                  <td className="text-center">
                    <span className={`usage-count ${voucher.used_count >= voucher.quantity ? 'text-red' : ''}`}>
                      {voucher.used_count} / {voucher.quantity}
                    </span>
                  </td>

                  {/* Trạng thái toggle */}
                  <td className="text-center">
                    {togglingId === voucher.id ? (
                      <span className="text-muted">...</span>
                    ) : (
                      <ToggleSwitch
                        checked={voucher.is_active}
                        onChange={() => handleToggle(voucher)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && vouchers.length > 0 && (
        <div className="vm-pagination">
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ‹ Trang trước
          </button>
          <span className="page-info">
            Trang <strong>{page}</strong> / {totalPages}
          </span>
          <button
            className="page-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            Trang sau ›
          </button>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <CreateVoucherModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setPage(1);
            fetchVouchers();
          }}
        />
      )}
    </div>
  );
};

export default VoucherManagement;